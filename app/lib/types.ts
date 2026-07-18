export type Theme = "vintage" | "minimal" | "modern";

export type LoadStatus = "idle" | "loading" | "ready" | "unavailable";

export type MapBounds = [[number, number], [number, number]];

export type EntityKind = "person" | "event" | "place" | "empire" | "monument";

export type HistoricRecord = {
  title: string;
  description?: string;
  extract?: string;
  thumbnailUrl?: string;
  wikidataId?: string;
  url?: string;
};

export type CountryMeta = {
  name: string;
  officialName?: string;
  region?: string;
  subregion?: string;
  capital?: string;
  population?: number;
  area?: number;
  languages?: string[];
  currencies?: string[];
  flagPng?: string;
  flagAlt?: string;
  latlng?: [number, number];
  borders?: string[];
  timezones?: string[];
};

export type AtlasPlace = {
  id: string;
  title: string;
  description?: string;
  extract?: string;
  thumbnailUrl?: string;
  url?: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
  type: "place" | "landmark" | "city";
  wikidataId?: string;
};

/** Connected history node (person, event, empire, place). */
export type HistoryEntity = {
  id: string;
  label: string;
  description?: string;
  kind: EntityKind;
  imageUrl?: string;
  yearStart?: string;
  yearEnd?: string;
  url?: string;
  latitude?: number;
  longitude?: number;
  extract?: string;
};

export type TimelineEntry = {
  id: string;
  label: string;
  description?: string;
  year: string;
  sortKey: number;
  kind: EntityKind;
  url?: string;
};

export type CountryDossier = {
  meta: CountryMeta | null;
  record: HistoricRecord | null;
  places: AtlasPlace[];
  people: HistoryEntity[];
  events: HistoryEntity[];
  empires: HistoryEntity[];
  timeline: TimelineEntry[];
};

export type PlaceDossier = {
  place: AtlasPlace;
  people: HistoryEntity[];
  events: HistoryEntity[];
  relatedPlaces: HistoryEntity[];
  timeline: TimelineEntry[];
};

export type CountrySelection = {
  name: string;
  bounds?: MapBounds;
  center?: [number, number];
};
