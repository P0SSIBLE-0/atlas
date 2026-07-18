import type { FillLayerSpecification, LineLayerSpecification } from "maplibre-gl";
import type { Theme } from "./types";

export const COUNTRY_SOURCE_URL =
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

export const MAP_STYLE = "https://demotiles.maplibre.org/style.json";

export const WORLD_VIEW = {
  longitude: 20,
  latitude: 20,
  zoom: 1.6,
} as const;

export function getMapStyle(theme: Theme): any {
  // Minimal theme uses Carto Positron directly
  if (theme === "minimal") {
    return "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  }

  let oceanColor = "#D8F2FF";
  let landColor = "#FFFFFF";
  let coastlineColor = "#198EC8";
  let boundaryColor = "rgba(255, 255, 255, 1)";
  let boundaryWidth = 0.8;

  // Detailing configurations
  let labelColor = "rgba(8, 37, 77, 1)";
  let labelHaloColor = "rgba(255, 255, 255, 1)";

  let geolineColor = "#1077B0";
  let geolineOpacity = 0.5;
  let geolineHaloColor = "rgba(255, 255, 255, 1)";

  if (theme === "vintage") {
    oceanColor = "#9bb2af"; // Faded vintage teal ocean
    landColor = "#f5ebd3"; // Soft parchment cream land
    coastlineColor = "#857053"; // Sketchy sepia coastline
    boundaryColor = "rgba(133, 112, 83, 0.45)"; // Soft sepia boundaries
    boundaryWidth = 1.0;

    labelColor = "#433222"; // Dark ink/brown country names
    labelHaloColor = "#f5ebd3"; // Halo matches land color

    geolineColor = "#857053"; // Sepia lines
    geolineOpacity = 0.28;
    geolineHaloColor = "#ecdcb9"; // Halo matches ocean color
  } else if (theme === "modern") {
    oceanColor = "#6687ad"; // Rich slate blue ocean
    landColor = "#f2f5ff"; // Bright cool white-blue land
    coastlineColor = "#4b6d93"; // Contrasting blue coastline
    boundaryColor = "rgba(102, 135, 173, 0.4)";
    boundaryWidth = 0.8;

    labelColor = "#15213b"; // Rich modern indigo text
    labelHaloColor = "#f2f5ff";

    geolineColor = "#4b6d93";
    geolineOpacity = 0.25;
    geolineHaloColor = "#6687ad";
  }

  return {
    version: 8,
    name: `Atlas-${theme}`,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      carto: {
        type: "vector",
        url: "https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json"
      },
      maplibre: {
        type: "vector",
        tiles: ["https://demotiles.maplibre.org/tiles/{z}/{x}/{y}.pbf"],
        maxzoom: 6,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": landColor,
        },
      },
      {
        id: "water-fill",
        type: "fill",
        source: "carto",
        "source-layer": "water",
        paint: {
          "fill-color": oceanColor,
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
        },
        paint: {
          "line-color": coastlineColor,
          "line-width": theme === "vintage" ? 1.2 : 0.8,
        },
      },
      {
        id: "admin-boundaries",
        type: "line",
        source: "carto",
        "source-layer": "boundary",
        filter: ["all", ["==", "admin_level", 2], ["==", "maritime", 0]],
        paint: {
          "line-color": boundaryColor,
          "line-width": boundaryWidth,
        },
      },
      {
        id: "geolines",
        type: "line",
        source: "maplibre",
        "source-layer": "geolines",
        filter: ["all", ["!=", "name", "International Date Line"]],
        paint: {
          "line-color": geolineColor,
          "line-opacity": geolineOpacity,
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
          "visibility": "visible",
          "symbol-placement": "line",
        },
        paint: {
          "text-color": geolineColor,
          "text-halo-blur": 1,
          "text-halo-color": geolineHaloColor,
          "text-halo-width": 1,
        },
      },
      // Country labels layer
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
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 2,
        },
      },
      // City labels layer (zoomed-in cities)
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
          "text-color": labelColor,
          "text-halo-color": labelHaloColor,
          "text-halo-width": 1.5,
        },
      },
    ],
  };
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
    fillColor = "#3a8c86";
    hoverOpacity = 0.20;
  } else if (theme === "modern") {
    fillColor = "#e26a4c";
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
    fillColor = "#327e79";
    opacity = 0.25;
  } else if (theme === "modern") {
    fillColor = "#e26a4c";
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
    [-32, 28],    // Mid-Atlantic
    [-125, -15],  // Pacific
    [75, -20],    // Indian Ocean
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
