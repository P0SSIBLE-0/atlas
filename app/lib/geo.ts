import type { MapBounds } from "./types";

type Position = number[];
type GeoJsonGeometry =
  | { type: "Point"; coordinates: Position }
  | { type: "MultiPoint"; coordinates: Position[] }
  | { type: "LineString"; coordinates: Position[] }
  | { type: "MultiLineString"; coordinates: Position[][] }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] }
  | { type: "GeometryCollection"; geometries: GeoJsonGeometry[] };

function expandBounds(
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  coords: Position,
) {
  const [lng, lat] = coords;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
  bounds.minLng = Math.min(bounds.minLng, lng);
  bounds.minLat = Math.min(bounds.minLat, lat);
  bounds.maxLng = Math.max(bounds.maxLng, lng);
  bounds.maxLat = Math.max(bounds.maxLat, lat);
}

function walkCoords(
  coords: unknown,
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
) {
  if (!Array.isArray(coords) || coords.length === 0) return;
  if (typeof coords[0] === "number") {
    expandBounds(bounds, coords as Position);
    return;
  }
  for (const item of coords) walkCoords(item, bounds);
}

function collectGeometryCoords(
  geom: GeoJsonGeometry,
  bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number },
) {
  if (geom.type === "GeometryCollection") {
    for (const child of geom.geometries ?? []) collectGeometryCoords(child, bounds);
    return;
  }
  walkCoords(geom.coordinates, bounds);
}

/** Compute geographic bounds from a GeoJSON geometry for map fitBounds. */
export function boundsFromGeometry(geometry: unknown): MapBounds | undefined {
  if (!geometry || typeof geometry !== "object") return undefined;
  const bounds = {
    minLng: Infinity,
    minLat: Infinity,
    maxLng: -Infinity,
    maxLat: -Infinity,
  };
  collectGeometryCoords(geometry as GeoJsonGeometry, bounds);
  if (!Number.isFinite(bounds.minLng) || !Number.isFinite(bounds.maxLng)) return undefined;
  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ];
}

export function centerFromBounds(bounds: MapBounds): [number, number] {
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
}

export function formatCoord(value: number, axis: "lat" | "lng"): string {
  const hemisphere =
    axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(2)}° ${hemisphere}`;
}

export function formatPopulation(value?: number): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatArea(value?: number): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value)} km²`;
}
