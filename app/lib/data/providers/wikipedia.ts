import type { HistoricRecord, AtlasPlace, HistoryEntity } from "../../types";
import type {
  WikidataSearchResponse,
  WikipediaSummaryResponse,
  WikipediaGeoSearchResponse,
  WikipediaLinksResponse,
} from "../types";
import { fetchJson, commonsThumb, wikipediaUrlFromTitle, classifyRelated } from "../utils";

const recordCache = new Map<string, HistoricRecord>();
const placesCache = new Map<string, AtlasPlace[]>();
const placeDetailCache = new Map<string, AtlasPlace>();
const entityDetailCache = new Map<string, HistoryEntity>();

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

  const wikidata =
    wikidataResult.status === "fulfilled" ? wikidataResult.value.search?.[0] : undefined;
  const wikipedia =
    wikipediaResult.status === "fulfilled" ? wikipediaResult.value : undefined;
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

/** Wikipedia links from an article page — replacement for the decommissioned /page/related/ endpoint. */
export async function fetchWikipediaRelated(
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
    const pages = Object.values(data.query?.pages ?? {}).filter((p) => !("missing" in p));
    return pages.slice(0, 16).map((page, index) => {
      const label = page.title ?? `Related ${index + 1}`;
      const desc = page.description;
      const kind = classifyRelated(desc);
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
      imageUrl:
        summary.originalimage?.source ?? summary.thumbnail?.source ?? entity.imageUrl,
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

// commonsThumb re-exported for any consumers that may need it
export { commonsThumb };
