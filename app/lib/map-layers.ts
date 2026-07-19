import type { FillLayerSpecification, LineLayerSpecification, Map as MaplibreMap } from "maplibre-gl";
import type { Theme } from "./types";

export const COUNTRY_SOURCE_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

export const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

export const WORLD_VIEW = {
  longitude: 82,
  latitude: 21,
  zoom: 1.6,
} as const;

type ThemeColors = {
  ocean: string;
  land: string;
  coastline: string;
  boundary: string;
  boundaryWidth: number;
  label: string;
  labelHalo: string;
  geoline: string;
  geolineOpacity: number;
  geolineHalo: string;
  coastlineWidth: number;
  showSatellite: boolean;
};

function themeColors(theme: Theme): ThemeColors {
  if (theme === "minimal") {
    return {
      ocean: "#e8eef2",
      land: "#f7f9fb",
      coastline: "#9aa8b0",
      boundary: "rgba(100, 115, 107, 0.35)",
      boundaryWidth: 0.75,
      label: "#3d4a45",
      labelHalo: "#f7f9fb",
      geoline: "#a0aab0",
      geolineOpacity: 0.22,
      geolineHalo: "#f7f9fb",
      coastlineWidth: 0.7,
      showSatellite: false,
    };
  }
  if (theme === "modern") {
    return {
      ocean: "#6687ad",
      land: "#f2f5ff",
      coastline: "#ffffff",
      boundary: "rgba(255, 255, 255, 0.75)",
      boundaryWidth: 1.2,
      label: "#ffffff",
      labelHalo: "#15213b",
      geoline: "#4b6d93",
      geolineOpacity: 0.2,
      geolineHalo: "#15213b",
      coastlineWidth: 0.8,
      showSatellite: true,
    };
  }
  // vintage (default)
  return {
    ocean: "#9bb2af",
    land: "#f5ebd3",
    coastline: "#857053",
    boundary: "rgba(133, 112, 83, 0.45)",
    boundaryWidth: 1.0,
    label: "#433222",
    labelHalo: "#f5ebd3",
    geoline: "#857053",
    geolineOpacity: 0.28,
    geolineHalo: "#ecdcb9",
    coastlineWidth: 1.2,
    showSatellite: false,
  };
}

/**
 * Single stable basemap style for all themes.
 * Theme switches only update paint/layout properties — no full style reload,
 * so country borders are not re-downloaded/re-parsed and the map stays interactive.
 */
export function getUnifiedMapStyle(initialTheme: Theme = "vintage"): any {
  const c = themeColors(initialTheme);
  return {
    version: 8,
    name: "Atlas-unified",
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      carto: {
        type: "vector",
        url: "https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json",
      },
      maplibre: {
        type: "vector",
        tiles: ["https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.pbf"],
        maxzoom: 6,
      },
      satellite: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        ],
        tileSize: 256,
        attribution: "Esri, USGS, NOAA",
      },
    },
    layers: [
      {
        id: "satellite-background",
        type: "raster",
        source: "satellite",
        layout: {
          visibility: c.showSatellite ? "visible" : "none",
        },
        paint: {
          "raster-opacity": 1,
        },
      },
      {
        id: "background",
        type: "background",
        layout: {
          visibility: c.showSatellite ? "none" : "visible",
        },
        paint: {
          "background-color": c.land,
        },
      },
      {
        id: "water-fill",
        type: "fill",
        source: "carto",
        "source-layer": "water",
        layout: {
          visibility: c.showSatellite ? "none" : "visible",
        },
        paint: {
          "fill-color": c.ocean,
        },
      },
      {
        id: "coastline",
        type: "line",
        source: "carto",
        "source-layer": "water",
        layout: {
          "line-cap": "round",
          "line-join": "round",
          visibility: c.showSatellite ? "none" : "visible",
        },
        paint: {
          "line-color": c.coastline,
          "line-width": c.coastlineWidth,
        },
      },
      {
        id: "admin-boundaries",
        type: "line",
        source: "carto",
        "source-layer": "boundary",
        filter: ["all", ["==", "admin_level", 2], ["==", "maritime", 0]],
        paint: {
          "line-color": c.boundary,
          "line-width": c.boundaryWidth,
        },
      },
      {
        id: "geolines",
        type: "line",
        source: "maplibre",
        "source-layer": "geolines",
        filter: ["all", ["!=", "name", "International Date Line"]],
        layout: {
          visibility: c.showSatellite ? "none" : "visible",
        },
        paint: {
          "line-color": c.geoline,
          "line-opacity": c.geolineOpacity,
          "line-dasharray": [3, 3],
        },
      },
      {
        id: "geolines-label",
        type: "symbol",
        source: "maplibre",
        "source-layer": "geolines",
        filter: ["all", ["!=", "name", "International Date Line"]],
        layout: {
          "text-font": ["Open Sans Semibold"],
          "text-size": {
            stops: [
              [2, 10],
              [6, 13],
            ],
          },
          "text-field": "{name}",
          visibility: c.showSatellite ? "none" : "visible",
          "symbol-placement": "line",
        },
        paint: {
          "text-color": c.geoline,
          "text-halo-blur": 1,
          "text-halo-color": c.geolineHalo,
          "text-halo-width": 1,
        },
      },
      {
        id: "country-labels",
        type: "symbol",
        source: "carto",
        "source-layer": "place",
        minzoom: 2,
        maxzoom: 6,
        filter: ["all", ["==", "class", "country"]],
        layout: {
          "text-font": ["Open Sans Semibold"],
          "text-size": {
            stops: [
              [2, 10],
              [5, 14],
            ],
          },
          "text-field": "{name:en}",
          "text-transform": "uppercase",
        },
        paint: {
          "text-color": c.label,
          "text-halo-color": c.labelHalo,
          "text-halo-width": 2,
        },
      },
      {
        id: "city-labels",
        type: "symbol",
        source: "carto",
        "source-layer": "place",
        minzoom: 4,
        filter: ["all", ["==", "class", "city"]],
        layout: {
          "text-font": ["Open Sans Semibold"],
          "text-size": {
            stops: [
              [4, 9],
              [8, 13],
            ],
          },
          "text-field": "{name:en}",
          "text-max-width": 8,
        },
        paint: {
          "text-color": c.label,
          "text-halo-color": c.labelHalo,
          "text-halo-width": 1.5,
        },
      },
    ],
  };
}

/** @deprecated Prefer getUnifiedMapStyle + applyThemeToMap — kept for any external callers. */
export function getMapStyle(theme: Theme): any {
  return getUnifiedMapStyle(theme);
}

/** Instant theme switch: only paint/layout properties, never reloads sources. */
export function applyThemeToMap(map: MaplibreMap, theme: Theme): void {
  if (!map.isStyleLoaded()) return;
  const c = themeColors(theme);
  const vis = (show: boolean) => (show ? "visible" : "none");

  const setPaint = (layer: string, prop: string, value: unknown) => {
    if (map.getLayer(layer)) map.setPaintProperty(layer, prop, value);
  };
  const setLayout = (layer: string, prop: string, value: unknown) => {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, prop, value);
  };

  setLayout("satellite-background", "visibility", vis(c.showSatellite));
  setLayout("background", "visibility", vis(!c.showSatellite));
  setLayout("water-fill", "visibility", vis(!c.showSatellite));
  setLayout("coastline", "visibility", vis(!c.showSatellite));
  setLayout("geolines", "visibility", vis(!c.showSatellite));
  setLayout("geolines-label", "visibility", vis(!c.showSatellite));

  setPaint("background", "background-color", c.land);
  setPaint("water-fill", "fill-color", c.ocean);
  setPaint("coastline", "line-color", c.coastline);
  setPaint("coastline", "line-width", c.coastlineWidth);
  setPaint("admin-boundaries", "line-color", c.boundary);
  setPaint("admin-boundaries", "line-width", c.boundaryWidth);
  setPaint("geolines", "line-color", c.geoline);
  setPaint("geolines", "line-opacity", c.geolineOpacity);
  setPaint("geolines-label", "text-color", c.geoline);
  setPaint("geolines-label", "text-halo-color", c.geolineHalo);
  setPaint("country-labels", "text-color", c.label);
  setPaint("country-labels", "text-halo-color", c.labelHalo);
  setPaint("city-labels", "text-color", c.label);
  setPaint("city-labels", "text-halo-color", c.labelHalo);
}

// ── Country boundaries cache ──────────────────────────────────────────────
// Re-parsing the large GeoJSON on every theme/style change freezes the UI.
// Keep one in-memory copy and share it with the map Source.

type CountriesGeoJSON = GeoJSON.FeatureCollection;

let countriesData: CountriesGeoJSON | null = null;
let countriesPromise: Promise<CountriesGeoJSON> | null = null;

export function preloadCountriesGeoJSON(): Promise<CountriesGeoJSON> {
  if (countriesData) return Promise.resolve(countriesData);
  if (countriesPromise) return countriesPromise;

  countriesPromise = fetch(COUNTRY_SOURCE_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Countries GeoJSON failed: ${res.status}`);
      return res.json() as Promise<CountriesGeoJSON>;
    })
    .then((data) => {
      countriesData = data;
      return data;
    })
    .catch((err) => {
      // Allow retry on next call
      countriesPromise = null;
      throw err;
    });

  return countriesPromise;
}

export function getCachedCountriesGeoJSON(): CountriesGeoJSON | null {
  return countriesData;
}

export function getCountryFill(theme: Theme): Omit<FillLayerSpecification, "source"> {
  let fillColor = "#d5a85b";
  let opacity = 0.14;

  if (theme === "minimal") {
    fillColor = "#c8dfdb";
    opacity = 0.22;
  } else if (theme === "modern") {
    fillColor = "#b7c7df";
    opacity = 0.20;
  }

  return {
    id: "atlas-countries-fill",
    type: "fill",
    paint: {
      "fill-color": fillColor,
      "fill-opacity": opacity,
    },
  };
}

export function getCountryLine(theme: Theme): Omit<LineLayerSpecification, "source"> {
  let lineColor = "#867a5c";
  let opacity = 0.75;
  let lineWidth = 0.85;

  if (theme === "vintage") {
    lineColor = "#857053";
    opacity = 0.6;
    lineWidth = 1.0;
  } else if (theme === "minimal") {
    lineColor = "#64736b";
    opacity = 0.45;
    lineWidth = 0.75;
  } else if (theme === "modern") {
    lineColor = "#4b6d93";
    opacity = 0.55;
    lineWidth = 0.8;
  }

  return {
    id: "atlas-countries-line",
    type: "line",
    paint: {
      "line-color": lineColor,
      "line-width": lineWidth,
      "line-opacity": opacity,
    },
  };
}

export function getHoverCountryFill(theme: Theme): Omit<FillLayerSpecification, "source"> {
  let fillColor = "#d5a85b";
  let hoverOpacity = 0.32;

  if (theme === "vintage") {
    fillColor = "#c49a3c";
    hoverOpacity = 0.28;
  } else if (theme === "minimal") {
    fillColor = "#0f766e";
    hoverOpacity = 0.20;
  } else if (theme === "modern") {
    fillColor = "#4f46e5";
    hoverOpacity = 0.22;
  }

  return {
    id: "atlas-hover-country",
    type: "fill",
    paint: {
      "fill-color": fillColor,
      "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], hoverOpacity, 0],
    },
  };
}

export function getSelectedCountryFill(
  name: string | undefined,
  theme: Theme,
): Omit<FillLayerSpecification, "source"> {
  let fillColor = "#c47134";
  let opacity = 0.38;

  if (theme === "vintage") {
    fillColor = "#b87a2c";
    opacity = 0.26;
  } else if (theme === "minimal") {
    fillColor = "#0d9488";
    opacity = 0.25;
  } else if (theme === "modern") {
    fillColor = "#6366f1";
    opacity = 0.32;
  }

  return {
    id: "atlas-selected-country",
    type: "fill",
    filter: ["==", "ADMIN", name ?? ""],
    paint: {
      "fill-color": fillColor,
      "fill-opacity": opacity,
    },
  };
}

export function getGraticulesGeoJSON() {
  const features = [];

  // Latitudes every 15 degrees
  for (let lat = -75; lat <= 75; lat += 15) {
    const coordinates = [];
    for (let lng = -180; lng <= 180; lng += 5) {
      coordinates.push([lng, lat]);
    }
    features.push({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates,
      },
      properties: { type: "latitude", value: lat },
    });
  }

  // Longitudes every 15 degrees
  for (let lng = -180; lng <= 180; lng += 15) {
    const coordinates = [];
    for (let lat = -80; lat <= 80; lat += 5) {
      coordinates.push([lng, lat]);
    }
    features.push({
      type: "Feature" as const,
      geometry: {
        type: "LineString" as const,
        coordinates,
      },
      properties: { type: "longitude", value: lng },
    });
  }

  return {
    type: "FeatureCollection" as const,
    features,
  };
}

export function getRhumbLinesGeoJSON() {
  const centers = [
    [-32, 28], // Mid-Atlantic
    [-125, -15], // Pacific
    [75, -20], // Indian Ocean
  ];
  const features = [];
  const length = 45;

  for (const center of centers) {
    const [cx, cy] = center;
    for (let i = 0; i < 16; i++) {
      const angle = (i * 2 * Math.PI) / 16;
      const ex = cx + length * Math.cos(angle) * 1.4;
      const ey = cy + length * Math.sin(angle);

      features.push({
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: [
            [cx, cy],
            [ex, ey],
          ],
        },
        properties: { type: "rhumb" },
      });
    }
  }

  return {
    type: "FeatureCollection" as const,
    features,
  };
}
