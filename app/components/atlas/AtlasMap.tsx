"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from "react";
import type { MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import Map, { Layer, NavigationControl, Source, Marker } from "react-map-gl/maplibre";
import { boundsFromGeometry, centerFromBounds } from "../../lib/geo";
import {
  COUNTRY_SOURCE_URL,
  WORLD_VIEW,
  getCountryFill,
  getCountryLine,
  getGraticulesGeoJSON,
  getMapStyle,
  getSelectedCountryFill,
  getRhumbLinesGeoJSON,
} from "../../lib/map-layers";
import type { AtlasPlace, MapBounds, Theme } from "../../lib/types";
import { PlaceMarkers } from "./PlaceMarkers";

export type CountryPick = {
  name: string;
  bounds?: MapBounds;
  center?: [number, number];
};

export type AtlasMapHandle = {
  flyToWorld: () => void;
  flyToBounds: (bounds: MapBounds, padding?: number) => void;
  flyToPoint: (lng: number, lat: number, zoom?: number) => void;
};

type AtlasMapProps = {
  theme: Theme;
  selectedCountryName?: string;
  places: AtlasPlace[];
  selectedPlaceId?: string;
  showPlaces: boolean;
  onCountrySelect: (pick: CountryPick) => void;
  onPlaceSelect: (place: AtlasPlace) => void;
  onMapReady?: () => void;
};

function CompassRose() {
  return (
    <div className="compass-rose-container select-none pointer-events-none opacity-65">
      <svg viewBox="0 0 100 100" width="90" height="90" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#857053" strokeWidth="1" strokeDasharray="1,3" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#857053" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#857053" strokeWidth="0.5" strokeDasharray="4,2" />

        {/* Ordinal points (diagonal) */}
        <g fill="#a89275" stroke="#857053" strokeWidth="0.5">
          <polygon points="50,50 69,31 50,38" fill="#8c775e" />
          <polygon points="50,50 69,31 62,50" />

          <polygon points="50,50 69,69 50,62" fill="#8c775e" />
          <polygon points="50,50 69,69 62,50" />

          <polygon points="50,50 31,69 50,62" fill="#8c775e" />
          <polygon points="50,50 31,69 38,50" />

          <polygon points="50,50 31,31 50,38" fill="#8c775e" />
          <polygon points="50,50 31,31 38,50" />
        </g>

        {/* Principal points (N, S, E, W) */}
        <g stroke="#857053" strokeWidth="0.5">
          {/* North */}
          <polygon points="50,50 50,15 56,50" fill="#a89275" />
          <polygon points="50,50 50,15 44,50" fill="#c2b09a" />

          {/* South */}
          <polygon points="50,50 50,85 56,50" fill="#c2b09a" />
          <polygon points="50,50 50,85 44,50" fill="#a89275" />

          {/* East */}
          <polygon points="50,50 85,50 50,56" fill="#a89275" />
          <polygon points="50,50 85,50 50,44" fill="#c2b09a" />

          {/* West */}
          <polygon points="50,50 15,50 50,56" fill="#c2b09a" />
          <polygon points="50,50 15,50 50,44" fill="#a89275" />
        </g>

        <text x="50" y="11" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fontWeight="bold" fill="#857053">N</text>
        <text x="50" y="96" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fontWeight="bold" fill="#857053">S</text>
        <text x="91" y="53" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fontWeight="bold" fill="#857053">E</text>
        <text x="9" y="53" textAnchor="middle" fontSize="9" fontFamily="Georgia, serif" fontWeight="bold" fill="#857053">W</text>

        <circle cx="50" cy="50" r="3.5" fill="#f5ebd3" stroke="#857053" strokeWidth="1" />
      </svg>
    </div>
  );
}

function SailingShip() {
  return (
    <div className="sailing-ship-container select-none pointer-events-none opacity-50">
      <svg viewBox="0 0 64 64" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 40 C20 40, 42 40, 48 36 C45 45, 20 45, 12 40 Z" fill="#857053" stroke="#5c4e3a" strokeWidth="0.75" />
        <path d="M48 36 L52 28 C45 32, 45 32, 48 36 Z" fill="#857053" stroke="#5c4e3a" strokeWidth="0.75" />
        <line x1="24" y1="40" x2="24" y2="12" stroke="#857053" strokeWidth="1.5" />
        <line x1="38" y1="38" x2="38" y2="16" stroke="#857053" strokeWidth="1.2" />
        <line x1="14" y1="40" x2="14" y2="24" stroke="#857053" strokeWidth="1.2" />
        <path d="M24 14 C30 18, 30 28, 24 34 C33 30, 31 18, 24 14 Z" fill="#f5ebd3" stroke="#857053" strokeWidth="0.75" />
        <path d="M38 18 C42 21, 42 28, 38 34 C44 31, 43 21, 38 18 Z" fill="#f5ebd3" stroke="#857053" strokeWidth="0.75" />
        <path d="M14 26 C18 28, 18 34, 14 38 C20 36, 19 28, 14 26 Z" fill="#f5ebd3" stroke="#857053" strokeWidth="0.75" />
        <path d="M8 43 Q14 41 20 43 T32 43 T44 43 T56 43" fill="none" stroke="#857053" strokeWidth="0.5" strokeDasharray="2,2" />
      </svg>
    </div>
  );
}

function SeaMonster() {
  return (
    <div className="sea-monster-container select-none pointer-events-none opacity-45">
      <svg viewBox="0 0 64 64" width="56" height="56" xmlns="http://www.w3.org/2000/svg">
        {/* Waves */}
        <path d="M5 45 Q12 40 20 45 T35 45 T50 45 T60 45" fill="none" stroke="#857053" strokeWidth="0.8" />
        <path d="M8 49 Q16 45 24 49 T40 49 T56 49" fill="none" stroke="#857053" strokeWidth="0.5" strokeDasharray="3,2" />

        {/* Serpent body arches */}
        <path d="M15 45 C15 30, 25 30, 25 45" fill="none" stroke="#857053" strokeWidth="3" strokeLinecap="round" />
        <path d="M30 45 C30 25, 42 25, 42 45" fill="none" stroke="#857053" strokeWidth="2.5" strokeLinecap="round" />

        {/* Neck & Head */}
        <path d="M8 45 C8 32, 12 24, 7 16 C12 18, 14 26, 12 45" fill="#f5ebd3" stroke="#857053" strokeWidth="0.75" />
        <circle cx="8" cy="18" r="0.8" fill="#857053" />
        <path d="M5 15 Q3 14 2 16" fill="none" stroke="#857053" strokeWidth="0.5" />

        {/* Tail */}
        <path d="M48 45 C48 35, 53 32, 55 24 Q57 28 54 45" fill="#f5ebd3" stroke="#857053" strokeWidth="0.75" />
      </svg>
    </div>
  );
}

export const AtlasMap = forwardRef<AtlasMapHandle, AtlasMapProps>(function AtlasMap(
  {
    theme,
    selectedCountryName,
    places,
    selectedPlaceId,
    showPlaces,
    onCountrySelect,
    onPlaceSelect,
    onMapReady,
  },
  ref,
) {
  const mapRef = useRef<MapRef>(null);

  useImperativeHandle(ref, () => ({
    flyToWorld() {
      mapRef.current?.flyTo({
        center: [WORLD_VIEW.longitude, WORLD_VIEW.latitude],
        zoom: WORLD_VIEW.zoom,
        duration: 520,
        essential: true,
      });
    },
    flyToBounds(bounds, padding = 72) {
      mapRef.current?.fitBounds(bounds, {
        padding: { top: 100, bottom: 48, left: 48, right: Math.min(420, window.innerWidth * 0.38) },
        duration: 620,
        essential: true,
        maxZoom: 7.5,
      });
      void padding;
    },
    flyToPoint(lng, lat, zoom = 10.5) {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom,
        duration: 480,
        essential: true,
        offset: [-Math.min(160, window.innerWidth * 0.12), 0],
      });
    },
  }));

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const properties = feature.properties;
      const countryName =
        properties?.ADMIN ?? properties?.name ?? properties?.NAME ?? properties?.NAME_EN;
      if (typeof countryName !== "string") return;

      const bounds = boundsFromGeometry(feature.geometry);
      const center = bounds ? centerFromBounds(bounds) : undefined;
      onCountrySelect({ name: countryName, bounds, center });
    },
    [onCountrySelect],
  );

  const styleObj = useMemo(() => getMapStyle(theme), [theme]);
  const graticulesData = useMemo(() => getGraticulesGeoJSON(), []);
  const rhumbLinesData = useMemo(() => getRhumbLinesGeoJSON(), []);

  const countryFillObj = useMemo(() => getCountryFill(theme), [theme]);
  const countryLineObj = useMemo(() => getCountryLine(theme), [theme]);
  const selectedCountryFillObj = useMemo(
    () => getSelectedCountryFill(selectedCountryName, theme),
    [selectedCountryName, theme],
  );

  return (
    <Map
      ref={mapRef}
      initialViewState={WORLD_VIEW}
      mapStyle={styleObj}
      interactiveLayerIds={["atlas-countries-fill"]}
      onClick={handleClick}
      onLoad={() => onMapReady?.()}
      cursor="pointer"
      attributionControl={false}
      reuseMaps
    >
      <NavigationControl position="bottom-left" showCompass visualizePitch={false} />

      {/* Coordinate grid graticules */}
      <Source id="atlas-graticules" type="geojson" data={graticulesData}>
        <Layer
          id="atlas-graticules-line"
          type="line"
          paint={{
            "line-color":
              theme === "vintage"
                ? "rgba(133, 112, 83, 0.20)"
                : theme === "minimal"
                  ? "rgba(0, 0, 0, 0.04)"
                  : "rgba(102, 135, 173, 0.09)",
            "line-width": 0.8,
            "line-dasharray": [3, 4],
          }}
        />
      </Source>

      {/* Rhumb lines vector web */}
      {theme === "vintage" && (
        <Source id="atlas-rhumb-lines" type="geojson" data={rhumbLinesData}>
          <Layer
            id="atlas-rhumb-lines-line"
            type="line"
            paint={{
              "line-color": "rgba(133, 112, 83, 0.12)",
              "line-width": 0.6,
            }}
          />
        </Source>
      )}

      <Source id="atlas-country-boundaries" type="geojson" data={COUNTRY_SOURCE_URL}>
        <Layer {...countryFillObj} />
        <Layer {...countryLineObj} />
        {selectedCountryName ? <Layer {...selectedCountryFillObj} /> : null}
      </Source>

      {/* Compass Roses, Sailing Ships, Sea Monsters & Ocean Labels in Vintage Look */}
      {theme === "vintage" && (
        <>
          <Marker longitude={-32} latitude={28} anchor="center" style={{ pointerEvents: "none" }}>
            <CompassRose />
          </Marker>
          <Marker longitude={-125} latitude={-15} anchor="center" style={{ pointerEvents: "none" }}>
            <CompassRose />
          </Marker>
          <Marker longitude={75} latitude={-20} anchor="center" style={{ pointerEvents: "none" }}>
            <CompassRose />
          </Marker>

          <Marker longitude={-18} latitude={45} anchor="center" style={{ pointerEvents: "none" }}>
            <SailingShip />
          </Marker>
          <Marker longitude={-8} latitude={-25} anchor="center" style={{ pointerEvents: "none" }}>
            <SailingShip />
          </Marker>
          <Marker longitude={-145} latitude={18} anchor="center" style={{ pointerEvents: "none" }}>
            <SailingShip />
          </Marker>
          <Marker longitude={90} latitude={-32} anchor="center" style={{ pointerEvents: "none" }}>
            <SailingShip />
          </Marker>

          {/* Ocean Labels */}
          <Marker longitude={-38} latitude={12} anchor="center" style={{ pointerEvents: "none" }}>
            <div className="ocean-label select-none pointer-events-none">OCEANUS ATLANTICUS</div>
          </Marker>
          <Marker longitude={-115} latitude={-6} anchor="center" style={{ pointerEvents: "none" }}>
            <div className="ocean-label select-none pointer-events-none">MARE PACIFICUM</div>
          </Marker>
          <Marker longitude={82} latitude={-15} anchor="center" style={{ pointerEvents: "none" }}>
            <div className="ocean-label select-none pointer-events-none">OCEANUS INDICUS</div>
          </Marker>
          <Marker longitude={15} latitude={-68} anchor="center" style={{ pointerEvents: "none" }}>
            <div className="ocean-label select-none pointer-events-none">TERRA INCOGNITA</div>
          </Marker>

          {/* Sea Monsters */}
          <Marker longitude={-85} latitude={-42} anchor="center" style={{ pointerEvents: "none" }}>
            <SeaMonster />
          </Marker>
          <Marker longitude={165} latitude={38} anchor="center" style={{ pointerEvents: "none" }}>
            <SeaMonster />
          </Marker>
        </>
      )}

      <PlaceMarkers
        places={places}
        selectedId={selectedPlaceId}
        visible={showPlaces}
        onSelect={onPlaceSelect}
      />
    </Map>
  );
});
