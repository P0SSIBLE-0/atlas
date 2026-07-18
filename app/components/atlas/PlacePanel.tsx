"use client";

import { useState, useEffect } from "react";
import { motion, type Variants } from "motion/react";
import { formatCoord } from "../../lib/geo";
import type { AtlasPlace, HistoryEntity, LoadStatus, TimelineEntry } from "../../lib/types";
import { EntityList } from "./EntityList";
import { HistoryTimeline } from "./HistoryTimeline";
import { LoadingPulse } from "./LoadingPulse";
import {
  ArrowLeft,
  X,
  ExternalLink,
  Compass,
  MapPin,
  Milestone,
} from "lucide-react";
import { MobileDrawer } from "./MobileDrawer";

type PlacePanelProps = {
  place: AtlasPlace;
  status: LoadStatus;
  people: HistoryEntity[];
  events: HistoryEntity[];
  relatedPlaces: HistoryEntity[];
  timeline: TimelineEntry[];
  countryName?: string;
  panelState: "entering" | "open" | "exiting";
  isBackground?: boolean;
  onBack: () => void;
  onClose: () => void;
  onSelectEntity: (entity: HistoryEntity) => void;
  onSelectRelatedPlace?: (entity: HistoryEntity) => void;
};

export function PlacePanel({
  place,
  status,
  people,
  events,
  relatedPlaces,
  timeline,
  countryName,
  panelState,
  isBackground = false,
  onBack,
  onClose,
  onSelectEntity,
  onSelectRelatedPlace,
}: PlacePanelProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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
      scale: 0.98,
      transition: {
        duration: 0.22,
        ease: "easeInOut",
      },
    },
  };

  return (
    <>
      <MobileDrawer
        isOpen={panelState === "open"}
        onClose={onClose}
        onBack={onBack}
        title={place.title}
        subtitle={place.description}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.75 border border-gold/20 bg-gold/8 text-gold text-[10px] font-bold tracking-[0.12em] uppercase rounded-theme font-ui">
            <Compass className="w-3 h-3" />
            Place · history graph
          </span>
        }
      >
        {!place.extract && status === "loading" ? (
          <LoadingPulse label={`Revealing ${place.title}…`} />
        ) : null}

        {place.thumbnailUrl ? (
          <div className="mb-4 overflow-hidden border border-line/45 rounded-theme shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="block w-full h-auto transition-transform duration-500 hover:scale-[1.03]"
              src={place.thumbnailUrl}
              alt={place.title}
            />
          </div>
        ) : null}

        {place.extract || status !== "loading" ? (
          <p className="mb-4 text-[15px] leading-[1.6] font-body text-ink/90 selection:bg-gold/20 select-text">
            {place.extract ?? "This place is marked on the map. Source detail was unavailable just now."}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 py-3.5 border-t border-b border-line bg-gold/[0.01]">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
            <div>
              <span className="block text-muted text-[9px] tracking-[0.13em] uppercase">Latitude</span>
              <b className="block mt-0.5 font-dates text-xs text-ink">{formatCoord(place.latitude, "lat")}</b>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
            <div>
              <span className="block text-muted text-[9px] tracking-[0.13em] uppercase">Longitude</span>
              <b className="block mt-0.5 font-dates text-xs text-ink">{formatCoord(place.longitude, "lng")}</b>
            </div>
          </div>
        </div>

        {place.distanceMeters != null ? (
          <div className="flex items-center gap-1.5 my-3 text-muted font-body text-xs leading-normal">
            <Milestone className="w-3.5 h-3.5 text-muted/65" />
            <p className="m-0">
              About {Math.round(place.distanceMeters / 1000)} km from the country focus point
            </p>
          </div>
        ) : null}

        <EntityList
          title="People connected here"
          entities={people}
          emptyHint="No people linked to this place in public sources."
          isLoading={status === "loading"}
          onSelect={onSelectEntity}
        />

        <EntityList
          title="Events at this place"
          entities={events}
          emptyHint="No dated events found for this site yet."
          isLoading={status === "loading"}
          onSelect={onSelectEntity}
        />

        <EntityList
          title="Nearby & related places"
          entities={relatedPlaces}
          isLoading={status === "loading"}
          onSelect={(entity) => {
            if (entity.latitude != null && entity.longitude != null && onSelectRelatedPlace) {
              onSelectRelatedPlace(entity);
            } else {
              onSelectEntity(entity);
            }
          }}
        />

        {status !== "loading" ? (
          <HistoryTimeline
            entries={timeline}
            onSelect={(entry) => {
              const match =
                people.find((item) => item.id === entry.id) ??
                events.find((item) => item.id === entry.id);
              if (match) onSelectEntity(match);
            }}
          />
        ) : null}

        {place.url ? (
          <a
            className="group inline-flex items-center gap-2 mt-4 px-3.5 py-2 border border-gold/30 hover:border-gold bg-gold/5 hover:bg-gold/10 text-gold text-[10.5px] font-bold tracking-[0.08em] no-underline uppercase rounded-theme font-ui transition-all duration-200 hover:shadow-xs"
            href={place.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>Read full article</span>
            <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ) : null}
      </MobileDrawer>

      <motion.aside
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`hidden md:block absolute z-[22] top-[calc(var(--topbar-h)+28px)] right-7 w-[var(--panel-w)] max-h-[calc(100vh-var(--topbar-h)-100px)] max-h-[calc(100dvh-var(--topbar-h)-100px)] overflow-y-auto custom-scrollbar p-[22px_24px_28px] border border-line bg-paper/94 shadow-[-14px_18px_48px_rgba(42,52,36,0.24)] backdrop-blur-xl overscroll-contain rounded-none ${isBackground ? "panel-background" : ""}`}
      aria-live="polite"
      aria-label={`${place.title} details`}
    >
      <div className="flex justify-between items-center text-muted text-[10px] font-bold tracking-[0.14em] uppercase mb-4 font-ui">
        <button
          type="button"
          className="group inline-flex items-center gap-1.5 border-0 bg-transparent text-gold text-[11px] font-bold tracking-[0.08em] uppercase p-0 cursor-pointer transition-colors hover:text-gold/80"
          onClick={onBack}
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>{countryName ?? "Country"}</span>
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center border-0 bg-transparent text-muted hover:text-ink w-6 h-6 rounded-full hover:bg-line/20 cursor-pointer transition-all duration-200"
          onClick={onClose}
          aria-label="Close place details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="pb-4.5 border-b border-line">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.75 border border-gold/20 bg-gold/8 text-gold text-[10px] font-bold tracking-[0.12em] uppercase rounded-theme font-ui">
            <Compass className="w-3 h-3" />
            Place · history graph
          </span>
        </div>
        <h1 className="m-0 font-medium text-[32px] max-sm:text-[26px] leading-[1.1] font-heading tracking-tight text-ink">
          {place.title}
        </h1>
        {place.description && (
          <div className="mt-2.5 pl-3 border-l-2 border-gold/30">
            <span className="block text-muted italic text-[13.5px] font-body leading-relaxed">
              {place.description}
            </span>
          </div>
        )}
      </div>

      {!place.extract && status === "loading" ? (
        <LoadingPulse label={`Revealing ${place.title}…`} />
      ) : null}

      {place.thumbnailUrl ? (
        <div className="my-4 mb-2 overflow-hidden border border-line/45 rounded-theme shadow-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="block w-full max-h-[190px] object-cover transition-transform duration-500 hover:scale-[1.03]"
            src={place.thumbnailUrl}
            alt={place.title}
          />
        </div>
      ) : null}

      {place.extract || status !== "loading" ? (
        <p className="my-4 text-[15px] leading-[1.6] font-body text-ink/90 selection:bg-gold/20">
          {place.extract ?? "This place is marked on the map. Source detail was unavailable just now."}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 py-3.5 border-t border-b border-line bg-gold/[0.01]">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
          <div>
            <span className="block text-muted text-[9px] tracking-[0.13em] uppercase">Latitude</span>
            <b className="block mt-0.5 font-dates text-xs text-ink">{formatCoord(place.latitude, "lat")}</b>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gold/60 mt-0.5 shrink-0" />
          <div>
            <span className="block text-muted text-[9px] tracking-[0.13em] uppercase">Longitude</span>
            <b className="block mt-0.5 font-dates text-xs text-ink">{formatCoord(place.longitude, "lng")}</b>
          </div>
        </div>
      </div>

      {place.distanceMeters != null ? (
        <div className="flex items-center gap-1.5 my-3 text-muted font-body text-xs leading-normal">
          <Milestone className="w-3.5 h-3.5 text-muted/65" />
          <p className="m-0">
            About {Math.round(place.distanceMeters / 1000)} km from the country focus point
          </p>
        </div>
      ) : null}

      <EntityList
        title="People connected here"
        entities={people}
        emptyHint="No people linked to this place in public sources."
        isLoading={status === "loading"}
        onSelect={onSelectEntity}
      />

      <EntityList
        title="Events at this place"
        entities={events}
        emptyHint="No dated events found for this site yet."
        isLoading={status === "loading"}
        onSelect={onSelectEntity}
      />

      <EntityList
        title="Nearby & related places"
        entities={relatedPlaces}
        isLoading={status === "loading"}
        onSelect={(entity) => {
          if (entity.latitude != null && entity.longitude != null && onSelectRelatedPlace) {
            onSelectRelatedPlace(entity);
          } else {
            onSelectEntity(entity);
          }
        }}
      />

      {status !== "loading" ? (
        <HistoryTimeline
          entries={timeline}
          onSelect={(entry) => {
            const match =
              people.find((item) => item.id === entry.id) ??
              events.find((item) => item.id === entry.id);
            if (match) onSelectEntity(match);
          }}
        />
      ) : null}

      {place.url ? (
        <a
          className="group inline-flex items-center gap-2 mt-4 px-3.5 py-2 border border-gold/30 hover:border-gold bg-gold/5 hover:bg-gold/10 text-gold text-[10.5px] font-bold tracking-[0.08em] no-underline uppercase rounded-theme font-ui transition-all duration-200 hover:shadow-xs"
          href={place.url}
          target="_blank"
          rel="noreferrer"
        >
          <span>Read full article</span>
          <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      ) : null}
    </motion.aside>
    </>
  );
}
