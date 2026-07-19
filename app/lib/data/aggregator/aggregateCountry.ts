import type { CountryDossier, HistoryEntity, AtlasPlace } from "../../types";
import { withTimeout, withTimeoutResult } from "../utils";
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
 * 2) full — optional Wikidata with timeout (never blocks UI long)
 *
 * Incomplete results (timeouts with empty people/events) are NOT cached so
 * the next open of the same country can retry public sources.
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
  const qidPromise = withTimeoutResult(resolveWikidataId(countryName, signal), 8000, null, signal);

  const [meta, record, related, qidResult] = await Promise.all([
    metaPromise,
    recordPromise,
    relatedPromise,
    qidPromise,
  ]);

  let qid = qidResult.value;
  // Prefer QID from Wikipedia summary when search timed out or missed
  if (!qid && record?.wikidataId) {
    qid = record.wikidataId;
  }

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

  // Stream enrichment: each query independently emits a UI update as soon as it resolves.
  if (qid && !signal?.aborted) {
    let sPeople: HistoryEntity[] = [];
    let sEvents: HistoryEntity[] = [];
    let sEmpires: HistoryEntity[] = [];
    let sFamous: HistoryEntity[] = [];
    let peopleTimedOut = false;
    let eventsTimedOut = false;
    let placesTimedOut = false;

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

    // People: longer budget + one automatic retry on empty/timeout
    const p1 = (async () => {
      const first = await withTimeoutResult(fetchCountryPeople(qid!, signal), 10000, [], signal);
      if (!signal?.aborted && (first.value.length > 0 || !first.timedOut)) {
        sPeople = first.value;
        peopleTimedOut = first.timedOut && first.value.length === 0;
        emit();
        return;
      }
      // Retry once — public APIs are often flaky under load
      const second = await withTimeoutResult(fetchCountryPeople(qid!, signal), 12000, [], signal);
      sPeople = second.value;
      peopleTimedOut = second.timedOut && second.value.length === 0;
      emit();
    })();

    const p2 = withTimeoutResult(fetchCountryEvents(qid, signal), 8000, [], signal).then((r) => {
      sEvents = r.value;
      eventsTimedOut = r.timedOut && r.value.length === 0;
      emit();
    });
    const p3 = withTimeoutResult(fetchFamousPlaces(qid, signal), 8000, [], signal).then((r) => {
      sFamous = r.value;
      placesTimedOut = r.timedOut && r.value.length === 0;
      emit();
    });
    const p4 =
      empires.length >= 3
        ? Promise.resolve()
        : withTimeout(fetchCountryEmpires(qid, signal), 6000, [], signal).then((r) => {
            sEmpires = r;
            emit();
          });

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

      // Never lock in a timeout-induced empty people/events state — next open can retry
      const incompleteDueToTimeout =
        (peopleTimedOut && finalPeople.length === 0) ||
        (eventsTimedOut && finalEvents.length === 0 && placesTimedOut && full.places.length === 0);

      if (!incompleteDueToTimeout) {
        dossierCache.set(cacheKey, full);
      }
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

  // No QID — only cache non-empty core results
  const coreHasData = core.people.length > 0 || core.events.length > 0 || core.places.length > 0;
  if (coreHasData && !signal?.aborted && !qidResult.timedOut) {
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
