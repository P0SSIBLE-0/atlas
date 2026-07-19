/** Raw response shapes from external APIs. Internal to lib/data only. */

export type WikidataSearchResponse = {
  search?: Array<{ id: string; label: string; description?: string; concepturi?: string }>;
};

export type WikipediaSummaryResponse = {
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

export type WikipediaGeoSearchResponse = {
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

export type WikipediaLinksResponse = {
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

export type RestCountry = {
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

export type SparqlBinding = Record<string, { type: string; value: string; datatype?: string }>;
export type SparqlResponse = { results?: { bindings?: SparqlBinding[] } };

export type WikidataQuerySearchResponse = {
  query?: {
    search?: Array<{ title: string; snippet?: string }>;
  };
};

export type WikidataEntityClaim = {
  mainsnak?: {
    datavalue?: {
      value?:
        | string
        | { id?: string; time?: string; text?: string; "entity-type"?: string };
    };
    datatype?: string;
  };
};

export type WikidataEntitiesResponse = {
  entities?: Record<
    string,
    {
      id?: string;
      labels?: Record<string, { value?: string }>;
      descriptions?: Record<string, { value?: string }>;
      claims?: Record<string, WikidataEntityClaim[]>;
    }
  >;
};
