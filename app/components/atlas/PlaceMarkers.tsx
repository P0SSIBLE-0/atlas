"use client";

import { Marker } from "react-map-gl/maplibre";
import type { AtlasPlace } from "../../lib/types";

type PlaceMarkersProps = {
  places: AtlasPlace[];
  selectedId?: string;
  visible: boolean;
  onSelect: (place: AtlasPlace) => void;
};

export function PlaceMarkers({ places, selectedId, visible, onSelect }: PlaceMarkersProps) {
  if (!visible || places.length === 0) return null;

  return (
    <>
      {places.map((place, index) => {
        const selected = place.id === selectedId;
        return (
          <Marker
            key={place.id}
            longitude={place.longitude}
            latitude={place.latitude}
            anchor="bottom"
            onClick={(event) => {
              event.originalEvent.stopPropagation();
              onSelect(place);
            }}
          >
            <button
              type="button"
              className={`map-place-marker ${selected ? "is-selected" : ""} marker-enter`}
              style={{ animationDelay: `${Math.min(index, 8) * 20}ms` }}
              aria-label={`Open ${place.title}`}
            >
              <span className="marker-pin" />
              <b>{place.title}</b>
            </button>
          </Marker>
        );
      })}
    </>
  );
}
