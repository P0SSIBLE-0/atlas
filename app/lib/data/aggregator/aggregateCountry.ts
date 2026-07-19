import type { CountryDossier, HistoryEntity, AtlasPlace } from "../../types";
import { withTimeout } from "../utils";
import { resolveWikidataId, fetchCountryPeople, fetchCountryEvents, fetchCountryEmpires, fetchFamousPlaces } from "../providers/wikidata";
import { getHistoricRecord, fetchWikipediaRelated, getPlacesNear } from "../providers/wikipedia";
import { getCountryMeta } from "../providers/restcountries";
import { mergeEntities, entitiesToMapPlaces, buildTimeline } from "../normalizers/entity";
import { enrichPlacesPreview } from "../normalizers/place";

export type CountryDossierProgress = {
  stage: "core" | "full";
  dossier: CountryDossier;
};

const dossierCache = new Map<string, CountryDossier>();

/**
 * Fast country load:
 * 1) core — REST + Wikipedia + related (snappy first paint)
 * 2) full — optional Wikidata SPARQL with short timeout (never blocks UI long)
 */
export async function loadCountryDossierProgressive(
  countryName: string,
  center: [number, number] | undefined,
  onUpdate: (progress: CountryDossierProgress) => void,
  signal?: AbortSignal,
): Promise<CountryDossier> {
  const cacheKey = countryName.trim().toLowerCase();
  const cached = dossierCache.get(cacheKey);
  if (cached) {
    onUpdate({ stage: "full", dossier: cached });
    return cached;
  }

  // Fire everything useful in one parallel wave — no sequential waterfall
  const metaPromise = getCountryMeta(countryName, signal);
  const recordPromise = getHistoricRecord(countryName, signal);
  const relatedPromise = withTimeout(fetchWikipediaRelated(countryName, signal), 5000, [], signal);
  // Give QID lookup a generous budget — Wikidata search can be slow.
  // A short timeout here causes the entire SPARQL phase to be silently skipped.
  const qidPromise = withTimeout(resolveWikidataId(countryName, signal), 7000, null, signal);

  const [meta, record, related, qid] = await Promise.all([
    metaPromise,
    recordPromise,
    relatedPromise,
    qidPromise,
  ]);

  const searchName = meta?.name ?? countryName;
  const lat = center?.[1] ?? meta?.latlng?.[0];
  const lng = center?.[0] ?? meta?.latlng?.[1];

  // Geo places in parallel with optional re-fetch of related under official name
  const [geoPlaces, relatedOfficial] = await Promise.all([
    lat != null && lng != null
      ? withTimeout(
          getPlacesNear(lat, lng, signal, { limit: 8, radiusMeters: 120_000 }),
          4000,
          [],
          signal,
        )
      : Promise.resolve([] as AtlasPlace[]),
    searchName.toLowerCase() !== countryName.toLowerCase()
      ? withTimeout(fetchWikipediaRelated(searchName, signal), 4000, related, signal)
      : Promise.resolve(related),
  ]);

  const relatedMerged = mergeEntities(relatedOfficial, related);
  let people = relatedMerged.filter((item) => item.kind === "person");
  let events = relatedMerged.filter((item) => item.kind === "event");
  let empires = relatedMerged.filter((item) => item.kind === "empire");
  let famous = relatedMerged.filter(
    (item) => item.kind === "place" || item.kind === "monument",
  );

  const famousAsPlaces = entitiesToMapPlaces(famous);
  const placeMap = new Map<string, AtlasPlace>();
  for (const place of [...famousAsPlaces, ...geoPlaces]) {
    const key = place.title.toLowerCase();
    if (!placeMap.has(key)) placeMap.set(key, place);
  }
  // Only enrich a few previews — thumbnails are nice-to-have
  const seedPlaces = [...placeMap.values()].slice(0, 12);
  const enrichedHead = await withTimeout(
    enrichPlacesPreview(seedPlaces.slice(0, 4), signal, 4),
    2200,
    seedPlaces.slice(0, 4),
    signal,
  );
  const finalPlaces = [...enrichedHead, ...seedPlaces.slice(4)];

  const core: CountryDossier = {
    meta,
    record,
    places: finalPlaces.slice(0, 12),
    people: people.slice(0, 10),
    events: events.slice(0, 10),
    empires: empires.slice(0, 6),
    timeline: buildTimeline([...events, ...empires, ...people]),
  };
  onUpdate({ stage: "core", dossier: core });

  // Stream SPARQL enrichment: each query independently emits a UI update as soon as it resolves.
  // No query blocks another — the UI sees people, events, places appear one by one.
  if (qid && !signal?.aborted) {
    // Accumulated results — mutated by each query's .then(), read by emit()
    let sPeople: HistoryEntity[] = [];
    let sEvents: HistoryEntity[] = [];
    let sEmpires: HistoryEntity[] = [];
    let sFamous: HistoryEntity[] = [];

    /** Build a dossier from current accumulated SPARQL state and push to UI. */
    const emit = () => {
      if (signal?.aborted) return;
      const p = mergeEntities(sPeople, people);
      const e = mergeEntities(sEvents, events);
      const em = mergeEntities(sEmpires, empires);
      const f = mergeEntities(sFamous, famous);
      const extraPlaces = entitiesToMapPlaces(f);
      const allPlaces = [...finalPlaces];
      for (const place of extraPlaces) {
        if (!allPlaces.some((fp) => fp.title.toLowerCase() === place.title.toLowerCase())) {
          allPlaces.push(place);
        }
      }
      onUpdate({
        stage: "full",
        dossier: {
          meta,
          record,
          places: allPlaces.slice(0, 14),
          people: p.slice(0, 12),
          events: e.slice(0, 12),
          empires: em.slice(0, 8),
          timeline: buildTimeline([...e, ...em, ...p]),
        },
      });
    };

    // Fire all four queries concurrently — each emits independently on arrival
    const p1 = withTimeout(fetchCountryPeople(qid, signal), 7000, [], signal)
      .then((r) => { sPeople = r; emit(); });
    const p2 = withTimeout(fetchCountryEvents(qid, signal), 7000, [], signal)
      .then((r) => { sEvents = r; emit(); });
    const p3 = withTimeout(fetchFamousPlaces(qid, signal), 7000, [], signal)
      .then((r) => { sFamous = r; emit(); });
    const p4 =
      empires.length >= 3
        ? Promise.resolve()
        : withTimeout(fetchCountryEmpires(qid, signal), 5000, [], signal)
            .then((r) => { sEmpires = r; emit(); });

    // Wait for all to settle before writing cache
    await Promise.allSettled([p1, p2, p3, p4]);

    if (!signal?.aborted) {
      const finalPeople = mergeEntities(sPeople, people);
      const finalEvents = mergeEntities(sEvents, events);
      const finalEmpires = mergeEntities(sEmpires, empires);
      const finalFamous = mergeEntities(sFamous, famous);
      const extraPlaces = entitiesToMapPlaces(finalFamous);
      for (const place of extraPlaces) {
        if (!finalPlaces.some((fp) => fp.title.toLowerCase() === place.title.toLowerCase())) {
          finalPlaces.push(place);
        }
      }
      const full: CountryDossier = {
        meta,
        record,
        places: finalPlaces.slice(0, 14),
        people: finalPeople.slice(0, 12),
        events: finalEvents.slice(0, 12),
        empires: finalEmpires.slice(0, 8),
        timeline: buildTimeline([...finalEvents, ...finalEmpires, ...finalPeople]),
      };
      dossierCache.set(cacheKey, full);
      return full;
    }

    return {
      meta,
      record,
      places: finalPlaces,
      people,
      events,
      empires,
      timeline: buildTimeline([...events, ...empires, ...people]),
    };
  }

  // Only cache non-empty core results — don't lock in a timeout-induced empty state
  const coreHasData = core.people.length > 0 || core.events.length > 0 || core.places.length > 0;
  if (coreHasData && !signal?.aborted) {
    dossierCache.set(cacheKey, core);
  }
  onUpdate({ stage: "full", dossier: core });
  return core;
}

/** Convenience non-progressive wrapper. */
export async function loadCountryDossier(
  countryName: string,
  center: [number, number] | undefined,
  signal?: AbortSignal,
): Promise<CountryDossier> {
  let last: CountryDossier | null = null;
  return loadCountryDossierProgressive(
    countryName,
    center,
    (progress) => {
      last = progress.dossier;
    },
    signal,
  ).then((dossier) => dossier ?? last!);
}
