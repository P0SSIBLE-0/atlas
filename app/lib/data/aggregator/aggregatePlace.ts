import type { AtlasPlace, HistoryEntity, PlaceDossier } from "../../types";
import { withTimeout } from "../utils";
import { resolveWikidataId, fetchPlacePeople, fetchPlaceEvents } from "../providers/wikidata";
import { fetchWikipediaRelated, getPlacesNear, getPlaceDetails } from "../providers/wikipedia";
import { mergeEntities, buildTimeline } from "../normalizers/entity";

const placeDossierCache = new Map<string, PlaceDossier>();

/**
 * Progressive place dossier loader.
 *
 * Fires Wikipedia related, nearby geo, and Wikidata SPARQL as independent
 * concurrent requests. Each calls `onUpdate` the moment it resolves —
 * the UI sees data appear section by section rather than waiting for the
 * slowest query.
 */
export async function loadPlaceDossierProgressive(
  place: AtlasPlace,
  signal: AbortSignal | undefined,
  onUpdate: (dossier: PlaceDossier) => void,
): Promise<PlaceDossier> {
  const cacheKey = place.title.toLowerCase();
  const cached = placeDossierCache.get(cacheKey);
  if (cached) {
    const hit = { ...cached, place: { ...cached.place, ...place } };
    onUpdate(hit);
    return hit;
  }

  // Must resolve first — gives us accurate coords + wikidataId
  const detailed = await getPlaceDetails(place, signal);

  // Live-accumulator — mutated by each source, read by emit()
  let curPeople: HistoryEntity[] = [];
  let curEvents: HistoryEntity[] = [];
  let curRelated: HistoryEntity[] = [];

  const emit = () => {
    if (signal?.aborted) return;
    onUpdate({
      place: detailed,
      people: curPeople.slice(0, 10),
      events: curEvents.slice(0, 10),
      relatedPlaces: curRelated,
      timeline: buildTimeline([...curEvents, ...curPeople]),
    });
  };

  // --- Wikipedia related (fires immediately, no qid needed) ---
  const relatedPromise = withTimeout(
    fetchWikipediaRelated(detailed.title, signal),
    5000,
    [],
    signal,
  ).then((related) => {
    curPeople = mergeEntities(
      related.filter((i) => i.kind === "person"),
      curPeople,
    );
    curEvents = mergeEntities(
      related.filter((i) => i.kind === "event"),
      curEvents,
    );
    curRelated = mergeEntities(
      related.filter((i) => i.kind === "place" || i.kind === "monument"),
      curRelated,
    );
    emit();
  });

  // --- Nearby geo (fires immediately) ---
  const nearbyPromise = withTimeout(
    getPlacesNear(detailed.latitude, detailed.longitude, signal, {
      limit: 6,
      radiusMeters: 25_000,
    }),
    4000,
    [],
    signal,
  ).then((nearby) => {
    const nearbyEntities: HistoryEntity[] = nearby
      .filter((item) => item.title.toLowerCase() !== detailed.title.toLowerCase())
      .map((item) => ({
        id: item.id,
        label: item.title,
        description: item.description,
        kind: "place" as const,
        latitude: item.latitude,
        longitude: item.longitude,
        url: item.url,
      }));
    curRelated = mergeEntities(curRelated, nearbyEntities).slice(0, 10);
    emit();
  });

  // --- QID resolution (SPARQL depends on this) ---
  const qid =
    detailed.wikidataId ??
    (await withTimeout(resolveWikidataId(detailed.title, signal), 6000, null, signal));

  // --- SPARQL (fires as soon as qid is known, in parallel with above) ---
  const sparqlPromises: Promise<void>[] = qid
    ? [
        withTimeout(fetchPlacePeople(qid, signal), 6000, [], signal).then((r) => {
          curPeople = mergeEntities(r, curPeople);
          emit();
        }),
        withTimeout(fetchPlaceEvents(qid, signal), 6000, [], signal).then((r) => {
          curEvents = mergeEntities(r, curEvents);
          emit();
        }),
      ]
    : [];

  await Promise.allSettled([relatedPromise, nearbyPromise, ...sparqlPromises]);

  const finalDossier: PlaceDossier = {
    place: detailed,
    people: curPeople.slice(0, 10),
    events: curEvents.slice(0, 10),
    relatedPlaces: curRelated,
    timeline: buildTimeline([...curEvents, ...curPeople]),
  };

  const hasData =
    finalDossier.people.length > 0 ||
    finalDossier.events.length > 0 ||
    finalDossier.relatedPlaces.length > 0;
  if (hasData && !signal?.aborted) {
    placeDossierCache.set(cacheKey, finalDossier);
  }

  return finalDossier;
}

/** Convenience non-progressive wrapper (keeps the old call site working). */
export async function loadPlaceDossier(
  place: AtlasPlace,
  signal?: AbortSignal,
): Promise<PlaceDossier> {
  let last: PlaceDossier | null = null;
  return loadPlaceDossierProgressive(place, signal, (d) => {
    last = d;
  }).then((d) => d ?? last!);
}
