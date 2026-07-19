/**
 * Backward-compatibility barrel.
 *
 * This file exists solely so that existing imports continue to work
 * without modification. All logic now lives under lib/data/.
 *
 * DO NOT add new logic here. Add providers under lib/data/providers/,
 * normalizers under lib/data/normalizers/, and orchestration under
 * lib/data/aggregator/.
 */

// Providers
export { resolveWikidataId } from "./data/providers/wikidata";
export {
  getHistoricRecord,
  getPlacesNear,
  getPlaceDetails,
  getEntityDetails,
  fetchWikipediaRelated,
} from "./data/providers/wikipedia";
export { getCountryMeta } from "./data/providers/restcountries";

// Normalizers
export { enrichPlacesPreview } from "./data/normalizers/place";
export {
  buildTimeline,
  mergeEntities,
  entitiesToMapPlaces,
  bindingToEntity,
} from "./data/normalizers/entity";

// Aggregators
export {
  loadCountryDossierProgressive,
  loadCountryDossier,
} from "./data/aggregator/aggregateCountry";
export type { CountryDossierProgress } from "./data/aggregator/aggregateCountry";

export { loadPlaceDossier, loadPlaceDossierProgressive } from "./data/aggregator/aggregatePlace";
