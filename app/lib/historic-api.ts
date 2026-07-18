import type {
  AtlasPlace,
  CountryDossier,
  CountryMeta,
  EntityKind,
  HistoricRecord,
  HistoryEntity,
  PlaceDossier,
  TimelineEntry,
} from "./types";

type WikidataSearchResponse = {
  search?: Array<{ id: string; label: string; description?: string; concepturi?: string }>;
};

type WikipediaSummaryResponse = {
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
  originalimage?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
  coordinates?: { lat?: number; lon?: number };
  type?: string;
  wikibase_item?: string;
};

type WikipediaGeoSearchResponse = {
  query?: {
    geosearch?: Array<{
      pageid: number;
      title: string;
      lat: number;
      lon: number;
      dist: number;
    }>;
  };
};

type WikipediaLinksResponse = {
  query?: {
    pages?: Record<
      string,
      {
        pageid?: number;
        title?: string;
        description?: string;
        thumbnail?: { source?: string };
        coordinates?: Array<{ lat?: number; lon?: number; primary?: string }>;
        missing?: string;
      }
    >;
  };
};

type RestCountry = {
  name?: { common?: string; official?: string };
  region?: string;
  subregion?: string;
  capital?: string[];
  population?: number;
  area?: number;
  languages?: Record<string, string>;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  flags?: { png?: string; svg?: string; alt?: string };
  latlng?: [number, number];
  borders?: string[];
  timezones?: string[];
  cca2?: string;
};

type SparqlBinding = Record<string, { type: string; value: string; datatype?: string }>;
type SparqlResponse = { results?: { bindings?: SparqlBinding[] } };

const recordCache = new Map<string, HistoricRecord>();
const countryCache = new Map<string, CountryMeta>();
const placesCache = new Map<string, AtlasPlace[]>();
const placeDetailCache = new Map<string, AtlasPlace>();
const qidCache = new Map<string, string | null>();
const entityDetailCache = new Map<string, HistoryEntity>();
const dossierCache = new Map<string, CountryDossier>();
const placeDossierCache = new Map<string, PlaceDossier>();

async function fetchJson<T>(url: string, signal?: AbortSignal, headers?: HeadersInit): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json", ...headers },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

/** Resolve quickly; fall back if the network stalls. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T, signal?: AbortSignal): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);

    const onAbort = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(fallback);
      }
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

function commonsThumb(url?: string, width = 240): string | undefined {
  if (!url) return undefined;
  if (url.includes("Special:FilePath")) {
    return `${url}${url.includes("?") ? "&" : "?"}width=${width}`;
  }
  return url;
}

function parseWktPoint(value?: string): { lat: number; lng: number } | undefined {
  if (!value) return undefined;
  const match = /Point\(([-0-9.]+)\s+([-0-9.]+)\)/i.exec(value);
  if (!match) return undefined;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

function yearFromIso(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /^(-?\d{1,6})/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  if (!Number.isFinite(year)) return undefined;
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

function sortKeyFromIso(value?: string): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const match = /^(-?\d{1,6})/.exec(value);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function qidFromUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  const match = /\/(Q\d+)$/.exec(uri);
  return match?.[1];
}

function wikipediaUrlFromTitle(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function classifyRelated(description?: string, type?: string): EntityKind {
  const text = `${description ?? ""} ${type ?? ""}`.toLowerCase();
  if (/\b(emperor|king|queen|ruler|president|prime minister|general|philosopher|poet|scientist|artist|sultan|pharaoh|leader|born|politician|writer)\b/.test(text)) {
    return "person";
  }
  if (/\b(battle|war|treaty|revolution|independence|siege|massacre|coronation|founding|invasion|rebellion|event)\b/.test(text)) {
    return "event";
  }
  if (/\b(empire|dynasty|caliphate|kingdom|sultanate|republic|civilization)\b/.test(text)) {
    return "empire";
  }
  if (/\b(temple|monument|fort|palace|cathedral|mosque|pyramid|tomb|castle|museum|heritage)\b/.test(text)) {
    return "monument";
  }
  return "place";
}

/** Resolve a free-text name to a Wikidata Q-id. */
export async function resolveWikidataId(
  query: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (qidCache.has(key)) return qidCache.get(key) ?? null;

  try {
    const encoded = encodeURIComponent(query.trim());
    const data = await fetchJson<WikidataSearchResponse>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encoded}&language=en&limit=5&format=json&origin=*`,
      signal,
    );
    const hit =
      data.search?.find((item) =>
        /country|sovereign state|state|city|town|capital|monument|building|human settlement|archaeological/i.test(
          item.description ?? "",
        ),
      ) ?? data.search?.[0];
    const id = hit?.id ?? null;
    qidCache.set(key, id);
    return id;
  } catch {
    qidCache.set(key, null);
    return null;
  }
}

async function sparql(query: string, signal?: AbortSignal): Promise<SparqlBinding[]> {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const data = await fetchJson<SparqlResponse>(url, signal, {
    Accept: "application/sparql-results+json",
  });
  return data.results?.bindings ?? [];
}

function bindingToEntity(
  row: SparqlBinding,
  kind: EntityKind,
  idKey = "item",
): HistoryEntity | null {
  const id = qidFromUri(row[idKey]?.value) ?? row[idKey]?.value;
  const label = row[`${idKey}Label`]?.value;
  if (!id || !label || label.startsWith("Q")) return null;

  const point = parseWktPoint(row.coord?.value);
  const yearStart = yearFromIso(row.date?.value ?? row.birth?.value ?? row.inception?.value);
  const yearEnd = yearFromIso(row.end?.value ?? row.death?.value ?? row.dissolved?.value);

  return {
    id,
    label,
    description: row[`${idKey}Description`]?.value,
    kind,
    imageUrl: commonsThumb(row.image?.value),
    yearStart,
    yearEnd,
    url: `https://www.wikidata.org/wiki/${id}`,
    latitude: point?.lat,
    longitude: point?.lng,
  };
}

async function fetchCountryPeople(qid: string, signal?: AbortSignal): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?birth ?death ?image ?links WHERE {
      ?item wdt:P27 wd:${qid} ;
            wdt:P31 wd:Q5 ;
            wikibase:sitelinks ?links .
      FILTER(?links >= 40)
      OPTIONAL { ?item wdt:P569 ?birth . }
      OPTIONAL { ?item wdt:P570 ?death . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?links)
    LIMIT 12
  `;
  try {
    const rows = await sparql(query, signal);
    return rows
      .map((row) => bindingToEntity(row, "person"))
      .filter((item): item is HistoryEntity => Boolean(item));
  } catch {
    return [];
  }
}

async function fetchCountryEvents(qid: string, signal?: AbortSignal): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      ?item wdt:P17 wd:${qid} ;
            wdt:P31 ?type .
      VALUES ?type { wd:Q1190554 wd:Q178561 wd:Q131569 wd:Q10931 wd:Q198 wd:Q386724 }
      OPTIONAL { ?item wdt:P585 ?date . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?date)
    LIMIT 12
  `;
  try {
    const rows = await sparql(query, signal);
    return rows
      .map((row) => bindingToEntity(row, "event"))
      .filter((item): item is HistoryEntity => Boolean(item));
  } catch {
    return [];
  }
}

async function fetchCountryEmpires(qid: string, signal?: AbortSignal): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?inception ?dissolved ?image WHERE {
      ?item wdt:P17 wd:${qid} ;
            wdt:P31 ?type .
      VALUES ?type { wd:Q3024240 wd:Q4830453 wd:Q12473 wd:Q201819 }
      OPTIONAL { ?item wdt:P571 ?inception . }
      OPTIONAL { ?item wdt:P576 ?dissolved . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 10
  `;
  try {
    const rows = await sparql(query, signal);
    const mapped: HistoryEntity[] = [];
    for (const row of rows) {
      const entity = bindingToEntity(row, "empire");
      if (!entity) continue;
      mapped.push({
        ...entity,
        yearStart: yearFromIso(row.inception?.value) ?? entity.yearStart,
        yearEnd: yearFromIso(row.dissolved?.value) ?? entity.yearEnd,
      });
    }
    // de-dupe
    const seen = new Set<string>();
    return mapped.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 8);
  } catch {
    return [];
  }
}

async function fetchFamousPlaces(qid: string, signal?: AbortSignal): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?coord ?image ?links WHERE {
      ?item wdt:P17 wd:${qid} ;
            wdt:P31 ?type ;
            wikibase:sitelinks ?links .
      VALUES ?type { wd:Q570116 wd:Q4989906 wd:Q8347141 wd:Q125553 wd:Q9088 wd:Q11276 wd:Q205142 wd:Q200744 wd:Q47672 }
      OPTIONAL { ?item wdt:P625 ?coord . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?links)
    LIMIT 16
  `;
  try {
    const rows = await sparql(query, signal);
    const seen = new Set<string>();
    const places: HistoryEntity[] = [];
    for (const row of rows) {
      const entity = bindingToEntity(row, "monument");
      if (!entity || seen.has(entity.id)) continue;
      seen.add(entity.id);
      places.push(entity);
    }
    return places.slice(0, 14);
  } catch {
    return [];
  }
}

async function fetchPlacePeople(qid: string, signal?: AbortSignal): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?birth ?death ?image WHERE {
      {
        ?item wdt:P19 wd:${qid} .
      } UNION {
        ?item wdt:P20 wd:${qid} .
      } UNION {
        ?item wdt:P551 wd:${qid} .
      }
      ?item wdt:P31 wd:Q5 .
      OPTIONAL { ?item wdt:P569 ?birth . }
      OPTIONAL { ?item wdt:P570 ?death . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 12
  `;
  try {
    const rows = await sparql(query, signal);
    const seen = new Set<string>();
    const people: HistoryEntity[] = [];
    for (const row of rows) {
      const entity = bindingToEntity(row, "person");
      if (!entity || seen.has(entity.id)) continue;
      seen.add(entity.id);
      people.push(entity);
    }
    return people.slice(0, 10);
  } catch {
    return [];
  }
}

async function fetchPlaceEvents(qid: string, signal?: AbortSignal): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      {
        ?item wdt:P276 wd:${qid} .
      } UNION {
        ?item wdt:P131 wd:${qid} ;
              wdt:P31/wdt:P279* wd:Q1190554 .
      }
      OPTIONAL { ?item wdt:P585 ?date . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?date)
    LIMIT 12
  `;
  try {
    const rows = await sparql(query, signal);
    return rows
      .map((row) => bindingToEntity(row, "event"))
      .filter((item): item is HistoryEntity => Boolean(item));
  } catch {
    return [];
  }
}

/** Wikipedia links from an article page — replacement for the decommissioned /page/related/ endpoint. */
async function fetchWikipediaRelated(
  title: string,
  signal?: AbortSignal,
): Promise<HistoryEntity[]> {
  try {
    const encoded = encodeURIComponent(title);
    // Action API with generator=links: returns pages linked from the article.
    // Supports origin=* so no proxy needed.
    const url =
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}` +
      `&generator=links&gpllimit=24&gplnamespace=0` +
      `&prop=description|pageimages&piprop=thumbnail&pithumbsize=120` +
      `&format=json&origin=*`;
    const data = await fetchJson<WikipediaLinksResponse>(url, signal);
    const pages = Object.values(data.query?.pages ?? {}).filter(
      (p) => !("missing" in p),
    );
    return pages.slice(0, 16).map((page, index) => {
      const label = page.title ?? `Related ${index + 1}`;
      const desc = page.description;
      const kind: HistoryEntity["kind"] =
        desc?.match(/\bperson\b|\bborn\b|\bpolitician\b|\bwriter\b|\bscientist\b/i)
          ? "person"
          : desc?.match(/\bevent\b|\bbattle\b|\bwar\b|\brevolution\b/i)
            ? "event"
            : desc?.match(/\bempire\b|\bdynasty\b|\bkingdom\b/i)
              ? "empire"
              : desc?.match(/\bmonument\b|\btemple\b|\bfort\b|\bpalace\b/i)
                ? "monument"
                : desc?.match(/\bcity\b|\btown\b|\bvillage\b|\bregion\b/i)
                  ? "place"
                  : "event";
      const coords = page.coordinates?.[0];
      return {
        id: `wiki-related-${page.pageid ?? label}`,
        label,
        description: desc,
        kind,
        imageUrl: page.thumbnail?.source,
        url: wikipediaUrlFromTitle(label),
        latitude: coords?.lat,
        longitude: coords?.lon,
      } satisfies HistoryEntity;
    });
  } catch {
    return [];
  }
}

function buildTimeline(entities: HistoryEntity[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const entity of entities) {
    if (!entity.yearStart) continue;
    const isoGuess = entity.yearStart.includes("BCE")
      ? `-${entity.yearStart.replace(/\D/g, "")}`
      : entity.yearStart;
    entries.push({
      id: entity.id,
      label: entity.label,
      description: entity.description,
      year: entity.yearEnd ? `${entity.yearStart} – ${entity.yearEnd}` : entity.yearStart,
      sortKey: sortKeyFromIso(isoGuess),
      kind: entity.kind,
      url: entity.url,
    });
  }
  return entries.sort((a, b) => a.sortKey - b.sortKey).slice(0, 18);
}

function mergeEntities(...lists: HistoryEntity[][]): HistoryEntity[] {
  const seen = new Set<string>();
  const merged: HistoryEntity[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = item.label.toLowerCase();
      if (seen.has(item.id) || seen.has(key)) continue;
      seen.add(item.id);
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function entitiesToMapPlaces(entities: HistoryEntity[]): AtlasPlace[] {
  return entities
    .filter((entity) => entity.latitude != null && entity.longitude != null)
    .map((entity) => ({
      id: entity.id,
      title: entity.label,
      description: entity.description,
      extract: entity.extract,
      thumbnailUrl: entity.imageUrl,
      url: entity.url,
      latitude: entity.latitude as number,
      longitude: entity.longitude as number,
      type: entity.kind === "monument" ? "landmark" : "place",
      wikidataId: entity.id.startsWith("Q") ? entity.id : undefined,
    }));
}

/** Wikipedia + Wikidata summary for a place or country name. */
export async function getHistoricRecord(
  query: string,
  signal?: AbortSignal,
): Promise<HistoricRecord | null> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const cacheKey = normalizedQuery.toLowerCase();
  const cached = recordCache.get(cacheKey);
  if (cached) return cached;

  const encodedQuery = encodeURIComponent(normalizedQuery);
  const wikidataUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodedQuery}&language=en&limit=1&format=json&origin=*`;
  const wikipediaUrl = `/api/proxy/wikipedia-rest/page/summary/${encodedQuery}`;

  const [wikidataResult, wikipediaResult] = await Promise.allSettled([
    fetchJson<WikidataSearchResponse>(wikidataUrl, signal),
    fetchJson<WikipediaSummaryResponse>(wikipediaUrl, signal),
  ]);

  const wikidata = wikidataResult.status === "fulfilled" ? wikidataResult.value.search?.[0] : undefined;
  const wikipedia = wikipediaResult.status === "fulfilled" ? wikipediaResult.value : undefined;
  if (!wikidata && !wikipedia) return null;

  const record: HistoricRecord = {
    title: wikipedia?.title ?? wikidata?.label ?? normalizedQuery,
    description: wikipedia?.description ?? wikidata?.description,
    extract: wikipedia?.extract,
    thumbnailUrl: wikipedia?.originalimage?.source ?? wikipedia?.thumbnail?.source,
    wikidataId: wikipedia?.wikibase_item ?? wikidata?.id,
    url: wikipedia?.content_urls?.desktop?.page ?? wikidata?.concepturi,
  };
  recordCache.set(cacheKey, record);
  return record;
}

/** Country facts from REST Countries (open data). */
export async function getCountryMeta(
  countryName: string,
  signal?: AbortSignal,
): Promise<CountryMeta | null> {
  const key = countryName.trim().toLowerCase();
  if (!key) return null;
  const cached = countryCache.get(key);
  if (cached) return cached;

  const encoded = encodeURIComponent(countryName.trim());
  const urls = [
    `/api/proxy/restcountries/name/${encoded}?fullText=true`,
    `/api/proxy/restcountries/name/${encoded}`,
  ];

  for (const url of urls) {
    try {
      const data = await fetchJson<RestCountry[]>(url, signal);
      const match =
        data.find((item) => item.name?.common?.toLowerCase() === key) ?? data[0];
      if (!match) continue;

      const meta: CountryMeta = {
        name: match.name?.common ?? countryName,
        officialName: match.name?.official,
        region: match.region,
        subregion: match.subregion,
        capital: match.capital?.[0],
        population: match.population,
        area: match.area,
        languages: match.languages ? Object.values(match.languages) : undefined,
        currencies: match.currencies
          ? Object.values(match.currencies).map((c) => c.name ?? "").filter(Boolean)
          : undefined,
        flagPng: match.flags?.png,
        flagAlt: match.flags?.alt ?? `Flag of ${match.name?.common ?? countryName}`,
        latlng: match.latlng,
        borders: match.borders,
        timezones: match.timezones?.slice(0, 4),
      };
      countryCache.set(key, meta);
      return meta;
    } catch {
      // try next URL
    }
  }
  return null;
}

export async function getPlacesNear(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
  options?: { limit?: number; radiusMeters?: number },
): Promise<AtlasPlace[]> {
  const limit = options?.limit ?? 14;
  const radius = options?.radiusMeters ?? 80_000;
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)},${radius},${limit}`;
  const cached = placesCache.get(cacheKey);
  if (cached) return cached;

  const url =
    `https://en.wikipedia.org/w/api.php?action=query&list=geosearch` +
    `&gscoord=${latitude}|${longitude}&gsradius=${radius}&gslimit=${limit}` +
    `&format=json&origin=*`;

  try {
    const data = await fetchJson<WikipediaGeoSearchResponse>(url, signal);
    const hits = data.query?.geosearch ?? [];
    const places: AtlasPlace[] = hits.map((hit) => ({
      id: String(hit.pageid),
      title: hit.title,
      latitude: hit.lat,
      longitude: hit.lon,
      distanceMeters: hit.dist,
      type: "place",
    }));
    placesCache.set(cacheKey, places);
    return places;
  } catch {
    return [];
  }
}

export async function getPlaceDetails(
  place: AtlasPlace,
  signal?: AbortSignal,
): Promise<AtlasPlace> {
  const cacheKey = place.title.toLowerCase();
  const cached = placeDetailCache.get(cacheKey);
  if (cached) return { ...place, ...cached, latitude: place.latitude, longitude: place.longitude };

  const encoded = encodeURIComponent(place.title.replace(/ /g, "_"));
  try {
    const summary = await fetchJson<WikipediaSummaryResponse>(
      `/api/proxy/wikipedia-rest/page/summary/${encoded}`,
      signal,
    );
    const detailed: AtlasPlace = {
      ...place,
      title: summary.title ?? place.title,
      description: summary.description,
      extract: summary.extract,
      thumbnailUrl: summary.originalimage?.source ?? summary.thumbnail?.source,
      url: summary.content_urls?.desktop?.page,
      latitude: summary.coordinates?.lat ?? place.latitude,
      longitude: summary.coordinates?.lon ?? place.longitude,
      type: summary.type === "standard" ? "landmark" : place.type,
      wikidataId: summary.wikibase_item ?? place.wikidataId,
    };
    placeDetailCache.set(cacheKey, detailed);
    return detailed;
  } catch {
    return place;
  }
}

export async function enrichPlacesPreview(
  places: AtlasPlace[],
  signal?: AbortSignal,
  concurrency = 4,
): Promise<AtlasPlace[]> {
  const results = [...places];
  let index = 0;

  async function worker() {
    while (index < results.length) {
      const current = index;
      index += 1;
      if (signal?.aborted) return;
      results[current] = await getPlaceDetails(results[current], signal);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, places.length) }, () => worker()));
  return results;
}

/** Load Wikipedia summary for any history entity (person / event / empire). */
export async function getEntityDetails(
  entity: HistoryEntity,
  signal?: AbortSignal,
): Promise<HistoryEntity> {
  const cacheKey = entity.label.toLowerCase();
  const cached = entityDetailCache.get(cacheKey);
  if (cached?.extract) return { ...entity, ...cached };

  try {
    const encoded = encodeURIComponent(entity.label.replace(/ /g, "_"));
    const summary = await fetchJson<WikipediaSummaryResponse>(
      `/api/proxy/wikipedia-rest/page/summary/${encoded}`,
      signal,
    );
    const detailed: HistoryEntity = {
      ...entity,
      label: summary.title ?? entity.label,
      description: summary.description ?? entity.description,
      extract: summary.extract ?? entity.extract,
      imageUrl: summary.originalimage?.source ?? summary.thumbnail?.source ?? entity.imageUrl,
      url: summary.content_urls?.desktop?.page ?? entity.url,
      latitude: summary.coordinates?.lat ?? entity.latitude,
      longitude: summary.coordinates?.lon ?? entity.longitude,
    };
    entityDetailCache.set(cacheKey, detailed);
    return detailed;
  } catch {
    return entity;
  }
}

export type CountryDossierProgress = {
  stage: "core" | "full";
  dossier: CountryDossier;
};

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
  const relatedPromise = withTimeout(fetchWikipediaRelated(countryName, signal), 3500, [], signal);
  const qidPromise = withTimeout(resolveWikidataId(countryName, signal), 2500, null, signal);

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
          3000,
          [],
          signal,
        )
      : Promise.resolve([] as AtlasPlace[]),
    searchName.toLowerCase() !== countryName.toLowerCase()
      ? withTimeout(fetchWikipediaRelated(searchName, signal), 2500, related, signal)
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

  // Background SPARQL enrichment — hard-capped so UI never waits forever
  if (qid && !signal?.aborted) {
    const empty: HistoryEntity[] = [];
    const [sparqlPeople, sparqlEvents, sparqlFamous] = await Promise.all([
      withTimeout(fetchCountryPeople(qid, signal), 2800, empty, signal),
      withTimeout(fetchCountryEvents(qid, signal), 2800, empty, signal),
      withTimeout(fetchFamousPlaces(qid, signal), 2800, empty, signal),
    ]);
    // Empires query is heavier — shorter budget or skip if we already have some
    const sparqlEmpires =
      empires.length >= 3
        ? empty
        : await withTimeout(fetchCountryEmpires(qid, signal), 2000, empty, signal);

    people = mergeEntities(sparqlPeople, people);
    events = mergeEntities(sparqlEvents, events);
    empires = mergeEntities(sparqlEmpires, empires);
    famous = mergeEntities(sparqlFamous, famous);

    const morePlaces = entitiesToMapPlaces(famous);
    for (const place of morePlaces) {
      if (!finalPlaces.some((p) => p.title.toLowerCase() === place.title.toLowerCase())) {
        finalPlaces.push(place);
      }
    }

    const full: CountryDossier = {
      meta,
      record,
      places: finalPlaces.slice(0, 14),
      people: people.slice(0, 12),
      events: events.slice(0, 12),
      empires: empires.slice(0, 8),
      timeline: buildTimeline([...events, ...empires, ...people]),
    };
    dossierCache.set(cacheKey, full);
    onUpdate({ stage: "full", dossier: full });
    return full;
  }

  dossierCache.set(cacheKey, core);
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

/** Place-level dossier — parallel, timeout-capped. */
export async function loadPlaceDossier(
  place: AtlasPlace,
  signal?: AbortSignal,
): Promise<PlaceDossier> {
  const cacheKey = place.title.toLowerCase();
  const cached = placeDossierCache.get(cacheKey);
  if (cached) return { ...cached, place: { ...cached.place, ...place } };

  const detailed = await getPlaceDetails(place, signal);
  const qid =
    detailed.wikidataId ??
    (await withTimeout(resolveWikidataId(detailed.title, signal), 2000, null, signal));

  const [related, nearby, sparqlPeople, sparqlEvents] = await Promise.all([
    withTimeout(fetchWikipediaRelated(detailed.title, signal), 3000, [], signal),
    withTimeout(
      getPlacesNear(detailed.latitude, detailed.longitude, signal, {
        limit: 6,
        radiusMeters: 25_000,
      }),
      2500,
      [],
      signal,
    ),
    qid
      ? withTimeout(fetchPlacePeople(qid, signal), 2500, [], signal)
      : Promise.resolve([] as HistoryEntity[]),
    qid
      ? withTimeout(fetchPlaceEvents(qid, signal), 2500, [], signal)
      : Promise.resolve([] as HistoryEntity[]),
  ]);

  let people = mergeEntities(
    sparqlPeople,
    related.filter((item) => item.kind === "person"),
  );
  let events = mergeEntities(
    sparqlEvents,
    related.filter((item) => item.kind === "event"),
  );
  let relatedPlaces = related.filter(
    (item) => item.kind === "place" || item.kind === "monument",
  );

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
  relatedPlaces = mergeEntities(relatedPlaces, nearbyEntities).slice(0, 10);

  const timeline = buildTimeline([...events, ...people]);
  const dossier: PlaceDossier = {
    place: detailed,
    people: people.slice(0, 10),
    events: events.slice(0, 10),
    relatedPlaces,
    timeline,
  };
  placeDossierCache.set(cacheKey, dossier);
  return dossier;
}
