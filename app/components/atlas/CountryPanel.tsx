"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "motion/react";
import { formatArea, formatPopulation } from "../../lib/geo";
import type {
  AtlasPlace,
  CountryMeta,
  HistoricRecord,
  HistoryEntity,
  LoadStatus,
  TimelineEntry,
} from "../../lib/types";
import { EntityList } from "./EntityList";
import { HistoryTimeline } from "./HistoryTimeline";
import { LoadingPulse } from "./LoadingPulse";
import { MobileDrawer } from "./MobileDrawer";
import {
  X,
  ExternalLink,
  Globe,
  Users,
  Expand,
  Map,
  Languages,
} from "lucide-react";

type CountryPanelProps = {
  countryName: string;
  status: LoadStatus;
  meta: CountryMeta | null;
  record: HistoricRecord | null;
  places: AtlasPlace[];
  people: HistoryEntity[];
  events: HistoryEntity[];
  empires: HistoryEntity[];
  timeline: TimelineEntry[];
  panelState: "entering" | "open" | "exiting";
  isBackground?: boolean;
  /** Per-section loading flags — skeleton stays until that specific source settles */
  loadingPlaces?: boolean;
  loadingPeople?: boolean;
  loadingEvents?: boolean;
  loadingEmpires?: boolean;
  onClose: () => void;
  onSelectPlace: (place: AtlasPlace) => void;
  onSelectEntity: (entity: HistoryEntity) => void;
};

export function CountryPanel({
  countryName,
  status,
  meta,
  record,
  places,
  people,
  events,
  empires,
  timeline,
  panelState,
  isBackground = false,
  loadingPlaces = false,
  loadingPeople = false,
  loadingEvents = false,
  loadingEmpires = false,
  onClose,
  onSelectPlace,
  onSelectEntity,
}: CountryPanelProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const regionLine = [meta?.subregion ?? meta?.region, meta?.capital ? `Capital · ${meta.capital}` : null]
    .filter(Boolean)
    .join(" · ");

  const placeEntities: HistoryEntity[] = places.map((place) => ({
    id: place.id,
    label: place.title,
    description: place.description,
    kind: place.type === "landmark" ? "monument" : "place",
    imageUrl: place.thumbnailUrl,
    url: place.url,
    latitude: place.latitude,
    longitude: place.longitude,
    extract: place.extract,
  }));

  const variants: Variants = {
    initial: {
      opacity: 0,
      x: 40,
      y: 0,
      scale: 0.98,
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        damping: 26,
        stiffness: 240,
        mass: 0.9,
      },
    },
    exit: {
      opacity: 0,
      x: 30,
      y: 10,
      scale: 0.68,
      transition: {
        duration: 0.22,
        ease: "easeInOut",
      },
    },
  };

  return (
    <>
      {/* Mobile Country Detail Drawer */}
      <MobileDrawer
        isOpen={panelState === "open"}
        onClose={onClose}
        title={meta?.name ?? countryName}
        subtitle={
          meta?.officialName && meta.officialName !== meta.name
            ? meta.officialName
            : record?.description ?? undefined
        }
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.75 border border-gold/20 bg-gold/8 text-gold text-[10px] font-bold tracking-[0.12em] uppercase rounded-theme font-ui">
            <Globe className="size-3" />
            Country
          </span>
        }
      >
        {!meta && !record && status === "loading" ? (
          <LoadingPulse label={`Opening history of ${countryName}…`} />
        ) : null}

        {record?.thumbnailUrl ? (
          <div className="mb-4 overflow-hidden border border-line/45 rounded-theme shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="block w-full h-auto transition-transform duration-500 hover:scale-[1.03]" src={record.thumbnailUrl} alt="" />
          </div>
        ) : null}

        {record?.extract ? (
          <p className="mb-4 text-[15px] leading-[1.6] font-body text-ink/90 selection:bg-gold/20 select-text">
            {record.extract}
          </p>
        ) : meta ? (
          <p className="mb-4 text-[15px] leading-[1.6] font-body text-ink/90 selection:bg-gold/20 select-text">
            Public sources are still gathering for {countryName}. Related people and places may still appear below.
          </p>
        ) : null}

        {meta ? (
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="flex items-start gap-2.5 p-[10px_12px] border border-line bg-gold/1 rounded-theme font-ui">
              <Users className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
              <div>
                <span className="block text-muted text-[9px] tracking-[0.12em] uppercase">Population</span>
                <b className="block mt-0.5 font-dates text-sm text-ink">{formatPopulation(meta.population)}</b>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-[10px_12px] border border-line bg-gold/1 rounded-theme font-ui">
              <Expand className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
              <div>
                <span className="block text-muted text-[9px] tracking-[0.12em] uppercase">Area</span>
                <b className="block mt-0.5 font-dates text-sm text-ink">{formatArea(meta.area)}</b>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-[10px_12px] border border-line bg-gold/1 rounded-theme font-ui">
              <Map className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
              <div>
                <span className="block text-muted text-[9px] tracking-[0.12em] uppercase">Region</span>
                <b className="block mt-0.5 font-body text-sm text-ink">{meta.region ?? "—"}</b>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-[10px_12px] border border-line bg-gold/1 rounded-theme font-ui">
              <Languages className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
              <div>
                <span className="block text-muted text-[9px] tracking-[0.12em] uppercase">Languages</span>
                <b className="block mt-0.5 font-body text-sm text-ink">{meta.languages?.slice(0, 2).join(", ") || "—"}</b>
              </div>
            </div>
          </div>
        ) : null}

        {meta?.currencies?.length ? (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {meta.currencies.slice(0, 3).map((currency) => (
              <span className="py-1 px-2 border border-line text-muted text-[10px] tracking-[0.03em] bg-gold/1 rounded-theme font-ui" key={currency}>
                {currency}
              </span>
            ))}
            {meta.timezones?.slice(0, 2).map((tz) => (
              <span className="py-1 px-2 border border-line text-muted text-[10px] tracking-[0.03em] bg-gold/1 rounded-theme font-ui" key={tz}>
                {tz}
              </span>
            ))}
          </div>
        ) : null}

        <EntityList
          title="Famous places"
          entities={placeEntities}
          emptyHint="No mapped places yet — try another country."
          isLoading={loadingPlaces}
          onSelect={(entity) => {
            const place = places.find((item) => item.id === entity.id);
            if (place) onSelectPlace(place);
            else onSelectEntity(entity);
          }}
        />

        <EntityList
          title="People of history"
          entities={people}
          emptyHint="No notable people returned from public sources."
          isLoading={loadingPeople}
          onSelect={onSelectEntity}
        />

        <EntityList
          title="Events"
          entities={events}
          emptyHint="No major events found for this country yet."
          isLoading={loadingEvents}
          onSelect={onSelectEntity}
        />

        <EntityList
          title="Empires & dynasties"
          entities={empires}
          isLoading={loadingEmpires}
          onSelect={onSelectEntity}
        />

        {status !== "loading" ? (
          <HistoryTimeline
            entries={timeline}
            onSelect={(entry) => {
              const match =
                people.find((item) => item.id === entry.id) ??
                events.find((item) => item.id === entry.id) ??
                empires.find((item) => item.id === entry.id);
              if (match) onSelectEntity(match);
            }}
          />
        ) : null}

        {record?.url ? (
          <a
            className="group inline-flex items-center gap-2 mt-4 px-3.5 py-2 border border-gold/30 hover:border-gold bg-gold/5 hover:bg-gold/10 text-gold text-[10.5px] font-bold tracking-[0.08em] no-underline uppercase rounded-theme font-ui transition-all duration-200 hover:shadow-xs"
            href={record.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>Open encyclopedia source</span>
            <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ) : null}
      </MobileDrawer>

      {/* Desktop Panel */}
      <motion.aside
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={`hidden md:block absolute z-18 top-[calc(var(--topbar-h)+14px)] right-4 w-[var(--panel-w)] max-h-[calc(100vh-var(--topbar-h)-100px)] max-h-[calc(100dvh-var(--topbar-h)-100px)] overflow-y-auto custom-scrollbar p-[22px_24px_28px] border border-line bg-paper/94 shadow-[-10px_12px_36px_rgba(52,65,42,0.16)] backdrop-blur-xl overscroll-contain rounded-theme ${isBackground ? "panel-background" : ""}`}
        aria-live="polite"
        aria-label={`${countryName} details`}
      >
        <div className="flex justify-between items-center text-muted text-[10px] font-bold tracking-[0.14em] uppercase mb-4 font-ui">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.75 border border-gold/20 bg-gold/8 text-gold text-[10px] font-bold tracking-[0.12em] uppercase rounded-theme font-ui">
            <Globe className="size-3" />
            Country
          </span>
          <button
            type="button"
            className="inline-flex items-center justify-center border-0 bg-transparent text-muted hover:text-ink w-6 h-6 rounded-full hover:bg-line/20 cursor-pointer transition-all duration-200"
            onClick={onClose}
            aria-label="Close country details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pb-4.5 border-b border-line">
          {regionLine && (
            <p className="m-0 mb-2.5 text-gold text-[10px] font-bold tracking-[0.15em] uppercase font-ui">
              {regionLine}
            </p>
          )}
          <div className="flex items-center gap-2.5 min-w-0">
            {meta?.flagPng ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="w-6.5 h-4.5 object-cover border border-line shrink-0 rounded-[1px] shadow-2xs" src={meta.flagPng} alt={meta.flagAlt ?? ""} />
            ) : null}
            <h1 className="m-0 font-medium text-[32px] max-sm:text-[26px] leading-[1.1] font-heading tracking-tight text-ink">{meta?.name ?? countryName}</h1>
          </div>
          {meta?.officialName && meta.officialName !== meta.name && (
            <div className="mt-2.5 pl-3 border-l-2 border-gold/30">
              <span className="block text-muted italic text-[13.5px] font-body leading-relaxed">{meta.officialName}</span>
            </div>
          )}
          {record?.description && !meta?.officialName && (
            <div className="mt-2.5 pl-3 border-l-2 border-gold/30">
              <span className="block text-muted italic text-[13.5px] font-body leading-relaxed">{record.description}</span>
            </div>
          )}
          {record?.description && meta?.officialName && (
            <span className="block mt-2 text-muted italic text-[13px] font-body leading-relaxed">{record.description}</span>
          )}
        </div>

        {!meta && !record && status === "loading" ? (
          <LoadingPulse label={`Opening history of ${countryName}…`} />
        ) : null}

        {record?.thumbnailUrl ? (
          <div className="my-4 mb-2 overflow-hidden border border-line/45 rounded-theme shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="block w-full h-auto transition-transform duration-500 hover:scale-[1.03]" src={record.thumbnailUrl} alt="" />
          </div>
        ) : null}

        {record?.extract || meta ? (
          <p className="my-4 text-[15px] leading-[1.6] font-body text-ink/90 selection:bg-gold/20">
            {record?.extract ??
              `Public sources are still gathering for ${countryName}. Related people and places may still appear below.`}
          </p>
        ) : null}

        {meta ? (
          <div className="grid grid-cols-2 gap-2.5 my-3 mb-4">
            <div className="flex items-start gap-2.5 p-[10px_12px] border border-line bg-gold/1 rounded-theme font-ui">
              <Users className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
              <div>
                <span className="block text-muted text-[9px] tracking-[0.12em] uppercase">Population</span>
                <b className="block mt-0.5 font-dates text-sm text-ink">{formatPopulation(meta.population)}</b>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-[10px_12px] border border-line bg-gold/1 rounded-theme font-ui">
              <Expand className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
              <div>
                <span className="block text-muted text-[9px] tracking-[0.12em] uppercase">Area</span>
                <b className="block mt-0.5 font-dates text-sm text-ink">{formatArea(meta.area)}</b>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-[10px_12px] border border-line bg-gold/1 rounded-theme font-ui">
              <Map className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
              <div>
                <span className="block text-muted text-[9px] tracking-[0.12em] uppercase">Region</span>
                <b className="block mt-0.5 font-body text-sm text-ink">{meta.region ?? "—"}</b>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-[10px_12px] border border-line bg-gold/1 rounded-theme font-ui">
              <Languages className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
              <div>
                <span className="block text-muted text-[9px] tracking-[0.12em] uppercase">Languages</span>
                <b className="block mt-0.5 font-body text-sm text-ink">{meta.languages?.slice(0, 2).join(", ") || "—"}</b>
              </div>
            </div>
          </div>
        ) : null}

        {meta?.currencies?.length ? (
          <div className="flex flex-wrap gap-1.5 mb-3.5">
            {meta.currencies.slice(0, 3).map((currency) => (
              <span className="py-1 px-2 border border-line text-muted text-[10px] tracking-[0.03em] bg-gold/1 rounded-theme font-ui" key={currency}>
                {currency}
              </span>
            ))}
            {meta.timezones?.slice(0, 2).map((tz) => (
              <span className="py-1 px-2 border border-line text-muted text-[10px] tracking-[0.03em] bg-gold/1 rounded-theme font-ui" key={tz}>
                {tz}
              </span>
            ))}
          </div>
        ) : null}

        <EntityList
          title="Famous places"
          entities={placeEntities}
          emptyHint="No mapped places yet — try another country."
          isLoading={loadingPlaces}
          onSelect={(entity) => {
            const place = places.find((item) => item.id === entity.id);
            if (place) onSelectPlace(place);
            else onSelectEntity(entity);
          }}
        />

        <EntityList
          title="People of history"
          entities={people}
          emptyHint="No notable people returned from public sources."
          isLoading={loadingPeople}
          onSelect={onSelectEntity}
        />

        <EntityList
          title="Events"
          entities={events}
          emptyHint="No major events found for this country yet."
          isLoading={loadingEvents}
          onSelect={onSelectEntity}
        />

        <EntityList
          title="Empires & dynasties"
          entities={empires}
          isLoading={loadingEmpires}
          onSelect={onSelectEntity}
        />

        {status !== "loading" ? (
          <HistoryTimeline
            entries={timeline}
            onSelect={(entry) => {
              const match =
                people.find((item) => item.id === entry.id) ??
                events.find((item) => item.id === entry.id) ??
                empires.find((item) => item.id === entry.id);
              if (match) onSelectEntity(match);
            }}
          />
        ) : null}

        {record?.url ? (
          <a
            className="group inline-flex items-center gap-2 mt-4 px-3.5 py-2 border border-gold/30 hover:border-gold bg-gold/5 hover:bg-gold/10 text-gold text-[10.5px] font-bold tracking-[0.08em] no-underline uppercase rounded-theme font-ui transition-all duration-200 hover:shadow-xs"
            href={record.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>Open encyclopedia source</span>
            <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ) : null}
      </motion.aside>
    </>
  );
}
