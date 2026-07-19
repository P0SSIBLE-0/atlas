"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  getEntityDetails,
  loadCountryDossierProgressive,
  loadPlaceDossierProgressive,
} from "../../lib/historic-api";
import { filterEntitiesByYear, yearFromTimeline } from "../../lib/timeline";
import type {
  AtlasPlace,
  CountryMeta,
  HistoricRecord,
  HistoryEntity,
  LoadStatus,
  Theme,
  TimelineEntry,
} from "../../lib/types";
import { AtlasMap, type AtlasMapHandle, type CountryPick } from "./AtlasMap";
import { CountryPanel } from "./CountryPanel";
import { EntityDetailPanel } from "./EntityDetailPanel";
import { PlacePanel } from "./PlacePanel";
import { TimelineDock } from "./TimelineDock";
import { TopBar } from "./TopBar";
import { MapLoader } from "./MapLoader";

type Depth = "world" | "country" | "place" | "entity";

export default function AtlasExplorer() {
  const mapHandle = useRef<AtlasMapHandle>(null);

  const [theme, setTheme] = useState<Theme>("vintage");
  const [depth, setDepth] = useState<Depth>("world");
  const [countryName, setCountryName] = useState<string | null>(null);
  const [countryCenter, setCountryCenter] = useState<[number, number] | undefined>();
  const [meta, setMeta] = useState<CountryMeta | null>(null);
  const [record, setRecord] = useState<HistoricRecord | null>(null);
  const [places, setPlaces] = useState<AtlasPlace[]>([]);
  const [people, setPeople] = useState<HistoryEntity[]>([]);
  const [events, setEvents] = useState<HistoryEntity[]>([]);
  const [empires, setEmpires] = useState<HistoryEntity[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [countryStatus, setCountryStatus] = useState<LoadStatus>("idle");

  const [selectedPlace, setSelectedPlace] = useState<AtlasPlace | null>(null);
  const [placePeople, setPlacePeople] = useState<HistoryEntity[]>([]);
  const [placeEvents, setPlaceEvents] = useState<HistoryEntity[]>([]);
  const [relatedPlaces, setRelatedPlaces] = useState<HistoryEntity[]>([]);
  const [placeTimeline, setPlaceTimeline] = useState<TimelineEntry[]>([]);
  const [placeStatus, setPlaceStatus] = useState<LoadStatus>("idle");

  const [selectedEntity, setSelectedEntity] = useState<HistoryEntity | null>(null);
  const [entityStatus, setEntityStatus] = useState<LoadStatus>("idle");
  const [entityReturnDepth, setEntityReturnDepth] = useState<"country" | "place">("country");

  // Per-section loading flags for country panel
  const [countryLoadingPlaces, setCountryLoadingPlaces] = useState(false);
  const [countryLoadingPeople, setCountryLoadingPeople] = useState(false);
  const [countryLoadingEvents, setCountryLoadingEvents] = useState(false);
  const [countryLoadingEmpires, setCountryLoadingEmpires] = useState(false);

  // Per-section loading flags for place panel
  const [placeLoadingPeople, setPlaceLoadingPeople] = useState(false);
  const [placeLoadingEvents, setPlaceLoadingEvents] = useState(false);
  const [placeLoadingRelated, setPlaceLoadingRelated] = useState(false);

  const [yearIndex, setYearIndex] = useState(4);
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    document.body.classList.remove("theme-vintage", "theme-minimal", "theme-modern");
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  const resetCountryData = () => {
    setMeta(null);
    setRecord(null);
    setPlaces([]);
    setPeople([]);
    setEvents([]);
    setEmpires([]);
    setTimeline([]);
    setCountryStatus("idle");
    setCountryLoadingPlaces(false);
    setCountryLoadingPeople(false);
    setCountryLoadingEvents(false);
    setCountryLoadingEmpires(false);
    setSelectedPlace(null);
    setPlacePeople([]);
    setPlaceEvents([]);
    setRelatedPlaces([]);
    setPlaceTimeline([]);
    setPlaceStatus("idle");
    setPlaceLoadingPeople(false);
    setPlaceLoadingEvents(false);
    setPlaceLoadingRelated(false);
    setSelectedEntity(null);
    setEntityStatus("idle");
    setActiveMomentId(null);
  };

  const applyCountryDossier = useCallback(
    (dossier: {
      meta: CountryMeta | null;
      record: HistoricRecord | null;
      places: AtlasPlace[];
      people: HistoryEntity[];
      events: HistoryEntity[];
      empires: HistoryEntity[];
      timeline: TimelineEntry[];
    }, ready: boolean) => {
      setMeta(dossier.meta);
      setRecord(dossier.record);
      setPlaces(dossier.places);
      setPeople(dossier.people);
      setEvents(dossier.events);
      setEmpires(dossier.empires);
      setTimeline(dossier.timeline);
      // Clear per-section loading as data arrives — each section independently
      if (dossier.places.length > 0) setCountryLoadingPlaces(false);
      if (dossier.people.length > 0) setCountryLoadingPeople(false);
      if (dossier.events.length > 0) setCountryLoadingEvents(false);
      if (dossier.empires.length > 0) setCountryLoadingEmpires(false);
      if (ready) {
        // Final — clear any still-loading sections (they had no data)
        setCountryLoadingPlaces(false);
        setCountryLoadingPeople(false);
        setCountryLoadingEvents(false);
        setCountryLoadingEmpires(false);
        setCountryStatus(
          dossier.record || dossier.meta || dossier.places.length ? "ready" : "unavailable",
        );
        if (dossier.timeline.length > 0) {
          setYearIndex(Math.min(4, dossier.timeline.length - 1));
        }
      } else {
        // Core arrived — keep status as loading so overall panel stays in loading state
        setCountryStatus("loading");
      }
    },
    [],
  );

  const goWorld = useCallback(() => {
    setDepth("world");
    setCountryName(null);
    setCountryCenter(undefined);
    resetCountryData();
    setYearIndex(4);
    mapHandle.current?.flyToWorld();
  }, []);

  const handleCountrySelect = useCallback((pick: CountryPick) => {
    setDepth("country");
    setCountryName(pick.name);
    setCountryCenter(pick.center);
    setSelectedPlace(null);
    setPlaceStatus("idle");
    setSelectedEntity(null);
    setMeta(null);
    setRecord(null);
    setPlaces([]);
    setPeople([]);
    setEvents([]);
    setEmpires([]);
    setTimeline([]);
    setActiveMomentId(null);
    setYearIndex(4);
    setCountryStatus("loading");
    // All sections start as loading
    setCountryLoadingPlaces(true);
    setCountryLoadingPeople(true);
    setCountryLoadingEvents(true);
    setCountryLoadingEmpires(true);

    if (pick.bounds) {
      mapHandle.current?.flyToBounds(pick.bounds);
    } else if (pick.center) {
      mapHandle.current?.flyToPoint(pick.center[0], pick.center[1], 5);
    }
  }, []);

  const handlePlaceSelect = useCallback((place: AtlasPlace) => {
    setDepth("place");
    setSelectedPlace(place);
    setPlacePeople([]);
    setPlaceEvents([]);
    setRelatedPlaces([]);
    setPlaceTimeline([]);
    setPlaceStatus("loading");
    setSelectedEntity(null);
    setActiveMomentId(null);
    setYearIndex(4);
    mapHandle.current?.flyToPoint(place.longitude, place.latitude, 11);
  }, []);

  const handleEntitySelect = useCallback(
    (entity: HistoryEntity, from: "country" | "place" = "country") => {
      setEntityReturnDepth(from);
      setDepth("entity");
      setSelectedEntity(entity);
      setEntityStatus("loading");
      setActiveMomentId(entity.id);

      if (entity.latitude != null && entity.longitude != null) {
        mapHandle.current?.flyToPoint(entity.longitude, entity.latitude, 9.5);
      }
    },
    [],
  );

  const resolveTimelineEntry = useCallback(
    (entry: TimelineEntry, from: "country" | "place") => {
      const pool =
        from === "place"
          ? [...placePeople, ...placeEvents]
          : [...people, ...events, ...empires];
      const match = pool.find((item) => item.id === entry.id);
      if (match) {
        handleEntitySelect(match, from);
        return;
      }
      // Synthetic entity from timeline row
      handleEntitySelect(
        {
          id: entry.id,
          label: entry.label,
          description: entry.description,
          kind: entry.kind,
          yearStart: entry.year,
          url: entry.url,
        },
        from,
      );
    },
    [empires, events, handleEntitySelect, people, placeEvents, placePeople],
  );

  const handleTimelineChange = useCallback(
    (index: number) => {
      setYearIndex(index);
      const entries = selectedPlace ? placeTimeline : timeline;
      const { entry } = yearFromTimeline(index, entries);
      setActiveMomentId(entry?.id ?? null);

      // If the moment has coordinates via matching entity, ease the map there
      if (entry) {
        type Locatable = { id: string; label: string; latitude?: number; longitude?: number };
        const pool: Locatable[] = selectedPlace
          ? [...placePeople, ...placeEvents, ...relatedPlaces]
          : [
            ...people,
            ...events,
            ...empires,
            ...places.map((p) => ({
              id: p.id,
              label: p.title,
              latitude: p.latitude,
              longitude: p.longitude,
            })),
          ];
        const match = pool.find((item) => item.id === entry.id || item.label === entry.label);
        if (match?.latitude != null && match.longitude != null) {
          mapHandle.current?.flyToPoint(match.longitude, match.latitude, selectedPlace ? 11 : 6.5);
        }
      }
    },
    [
      empires,
      events,
      people,
      placeEvents,
      placePeople,
      placeTimeline,
      places,
      relatedPlaces,
      selectedPlace,
      timeline,
    ],
  );

  const backFromEntity = useCallback(() => {
    setSelectedEntity(null);
    setEntityStatus("idle");
    if (entityReturnDepth === "place" && selectedPlace) {
      setDepth("place");
      mapHandle.current?.flyToPoint(selectedPlace.longitude, selectedPlace.latitude, 11);
    } else {
      setDepth("country");
      if (countryCenter) {
        mapHandle.current?.flyToPoint(countryCenter[0], countryCenter[1], 5.2);
      }
    }
  }, [countryCenter, entityReturnDepth, selectedPlace]);

  const backToCountry = useCallback(() => {
    setSelectedPlace(null);
    setPlacePeople([]);
    setPlaceEvents([]);
    setRelatedPlaces([]);
    setPlaceTimeline([]);
    setPlaceStatus("idle");
    setDepth("country");
    setActiveMomentId(null);
    if (countryCenter) {
      mapHandle.current?.flyToPoint(countryCenter[0], countryCenter[1], 5.2);
    }
  }, [countryCenter]);

  const closeCountry = useCallback(() => {
    goWorld();
  }, [goWorld]);

  // Progressive country dossier
  useEffect(() => {
    if (!countryName || depth === "world") return;
    const controller = new AbortController();

    loadCountryDossierProgressive(
      countryName,
      countryCenter,
      (progress) => {
        if (controller.signal.aborted) return;
        applyCountryDossier(progress.dossier, progress.stage === "full");

        if (progress.dossier.meta?.latlng && !countryCenter) {
          const [lat, lng] = progress.dossier.meta.latlng;
          mapHandle.current?.flyToPoint(lng, lat, 5);
        }
      },
      controller.signal,
    ).catch(() => {
      if (!controller.signal.aborted) setCountryStatus("unavailable");
    });

    return () => controller.abort();
  }, [applyCountryDossier, countryCenter, countryName, depth]);

  useEffect(() => {
    if (!selectedPlace) return;
    const seed = selectedPlace;
    const controller = new AbortController();

    // All place sections start loading
    setPlaceLoadingPeople(true);
    setPlaceLoadingEvents(true);
    setPlaceLoadingRelated(true);

    loadPlaceDossierProgressive(
      seed,
      controller.signal,
      (dossier) => {
        if (controller.signal.aborted) return;
        setSelectedPlace(dossier.place);
        setPlacePeople(dossier.people);
        setPlaceEvents(dossier.events);
        setRelatedPlaces(dossier.relatedPlaces);
        setPlaceTimeline(dossier.timeline);
        // Clear per-section loading as data arrives
        if (dossier.people.length > 0) setPlaceLoadingPeople(false);
        if (dossier.events.length > 0) setPlaceLoadingEvents(false);
        if (dossier.relatedPlaces.length > 0) setPlaceLoadingRelated(false);
        // Show panel as soon as any section has content
        setPlaceStatus((prev) =>
          prev === "loading" && (
            dossier.people.length > 0 ||
            dossier.events.length > 0 ||
            dossier.relatedPlaces.length > 0
          ) ? "ready" : prev,
        );
        if (dossier.timeline.length > 0) {
          setYearIndex((prev) => Math.min(prev, dossier.timeline.length - 1));
        }
      },
    )
      .then((dossier) => {
        if (controller.signal.aborted) return;
        // Final — clear any sections still marked loading (they had no data)
        setPlaceLoadingPeople(false);
        setPlaceLoadingEvents(false);
        setPlaceLoadingRelated(false);
        setPlaceStatus(
          dossier.people.length > 0 || dossier.events.length > 0 || dossier.relatedPlaces.length > 0
            ? "ready"
            : "unavailable",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPlaceLoadingPeople(false);
          setPlaceLoadingEvents(false);
          setPlaceLoadingRelated(false);
          setPlaceStatus("unavailable");
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlace?.id]);

  // Entity deep dive
  useEffect(() => {
    if (!selectedEntity) return;
    const seed = selectedEntity;
    const controller = new AbortController();

    getEntityDetails(seed, controller.signal)
      .then((detailed) => {
        if (controller.signal.aborted) return;
        setSelectedEntity(detailed);
        setEntityStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setEntityStatus("unavailable");
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity?.id]);

  const activeTimeline = selectedPlace ? placeTimeline : timeline;
  const { year: scrubYear } = yearFromTimeline(yearIndex, activeTimeline);

  const filteredPeople = useMemo(() => {
    if (activeTimeline.length > 0) return people;
    return filterEntitiesByYear(people, scrubYear);
  }, [activeTimeline.length, people, scrubYear]);

  const filteredEvents = useMemo(() => {
    if (activeTimeline.length > 0) {
      // Highlight the active moment's neighbors when scrubbing dated history
      if (!activeMomentId) return events;
      const idx = events.findIndex((e) => e.id === activeMomentId);
      if (idx < 0) return events;
      return events;
    }
    return filterEntitiesByYear(events, scrubYear);
  }, [activeMomentId, activeTimeline.length, events, scrubYear]);

  const filteredEmpires = useMemo(() => {
    if (activeTimeline.length > 0) return empires;
    return filterEntitiesByYear(empires, scrubYear);
  }, [activeTimeline.length, empires, scrubYear]);

  const filteredPlacePeople = useMemo(() => {
    if (placeTimeline.length > 0) return placePeople;
    return filterEntitiesByYear(placePeople, scrubYear);
  }, [placePeople, placeTimeline.length, scrubYear]);

  const filteredPlaceEvents = useMemo(() => {
    if (placeTimeline.length > 0) return placeEvents;
    return filterEntitiesByYear(placeEvents, scrubYear);
  }, [placeEvents, placeTimeline.length, scrubYear]);

  const showCountryPanel = depth !== "world" && countryName !== null;
  const showPlacePanel = selectedPlace !== null;
  const showEntityPanel = selectedEntity !== null;

  const dockLabel =
    selectedEntity?.label ??
    selectedPlace?.title ??
    meta?.name ??
    countryName ??
    undefined;

  return (
    <main className={`atlas theme-${theme} atlas-immersive`}>
      <div className="map-stage">
        <AtlasMap
          ref={mapHandle}
          theme={theme}
          selectedCountryName={countryName ?? undefined}
          places={places}
          selectedPlaceId={selectedPlace?.id ?? activeMomentId ?? undefined}
          showPlaces={depth !== "world" && places.length > 0}
          onCountrySelect={handleCountrySelect}
          onPlaceSelect={handlePlaceSelect}
          onMapReady={() => setMapLoading(false)}
        />

        <AnimatePresence>
          {mapLoading && <MapLoader />}
        </AnimatePresence>

        <div className="map-vignette" aria-hidden />

        <TopBar
          theme={theme}
          onThemeChange={setTheme}
          onHome={depth === "world" ? goWorld : closeCountry}
          depth={
            depth === "entity"
              ? entityReturnDepth === "place"
                ? "place"
                : "country"
              : depth === "place"
                ? "place"
                : depth === "country"
                  ? "country"
                  : "world"
          }
          label={meta?.name ?? countryName ?? undefined}
        />

        <AnimatePresence>
          {showCountryPanel && countryName && (
          <CountryPanel
              countryName={countryName}
              status={countryStatus}
              meta={meta}
              record={record}
              places={places}
              people={filteredPeople}
              events={filteredEvents}
              empires={filteredEmpires}
              timeline={timeline}
              panelState="open"
              isBackground={selectedPlace !== null || selectedEntity !== null}
              loadingPlaces={countryLoadingPlaces}
              loadingPeople={countryLoadingPeople}
              loadingEvents={countryLoadingEvents}
              loadingEmpires={countryLoadingEmpires}
              onClose={closeCountry}
              onSelectPlace={handlePlaceSelect}
              onSelectEntity={(entity) => handleEntitySelect(entity, "country")}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPlacePanel && selectedPlace && (
          <PlacePanel
              place={selectedPlace}
              status={placeStatus}
              people={filteredPlacePeople}
              events={filteredPlaceEvents}
              relatedPlaces={relatedPlaces}
              timeline={placeTimeline}
              countryName={meta?.name ?? countryName ?? undefined}
              panelState="open"
              isBackground={selectedEntity !== null}
              loadingPeople={placeLoadingPeople}
              loadingEvents={placeLoadingEvents}
              loadingRelated={placeLoadingRelated}
              onBack={backToCountry}
              onClose={closeCountry}
              onSelectEntity={(entity) => handleEntitySelect(entity, "place")}
              onSelectRelatedPlace={(entity) => {
                if (entity.latitude == null || entity.longitude == null) {
                  handleEntitySelect(entity, "place");
                  return;
                }
                handlePlaceSelect({
                  id: entity.id,
                  title: entity.label,
                  description: entity.description,
                  extract: entity.extract,
                  thumbnailUrl: entity.imageUrl,
                  url: entity.url,
                  latitude: entity.latitude,
                  longitude: entity.longitude,
                  type: entity.kind === "monument" ? "landmark" : "place",
                });
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showEntityPanel && selectedEntity && (
            <EntityDetailPanel
              entity={selectedEntity}
              status={entityStatus}
              panelState="open"
              contextLabel={
                entityReturnDepth === "place"
                  ? selectedPlace?.title
                  : meta?.name ?? countryName ?? undefined
              }
              onBack={backFromEntity}
              onClose={closeCountry}
            />
          )}
        </AnimatePresence>

        <TimelineDock
          visible={depth !== "world"}
          yearIndex={yearIndex}
          onChange={handleTimelineChange}
          onSelectEntry={(entry) =>
            resolveTimelineEntry(entry, selectedPlace ? "place" : "country")
          }
          contextLabel={dockLabel}
          entries={activeTimeline}
        />

        {depth === "world" ? (
          <div className="absolute min-w-[220px] z-12 left-1/2 -translate-x-1/2 bottom-7 flex items-center gap-2.25 text-ink text-xs font-body px-2 py-1.5 bg-paper/38 border border-ink/12 rounded-theme shadow-[0_4px_10px_rgba(0,0,0,0.06)]">
            <span className="size-1.75 rounded-full bg-gold shadow-[0_0_0_4px_rgba(255,239,187,0.4)] animate-pulse" />
            <p className="m-0">Click any country to explore its history</p>
          </div>
        ) : null}
      </div>


    </main>
  );
}
