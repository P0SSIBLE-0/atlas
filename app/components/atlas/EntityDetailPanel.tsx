"use client";

import { motion, type Variants } from "motion/react";
import {
  ArrowLeft,
  X,
  ExternalLink,
  User,
  Calendar,
  MapPin,
  Crown,
  Landmark,
  Clock,
} from "lucide-react";
import type { HistoryEntity, LoadStatus } from "../../lib/types";
import { LoadingPulse } from "./LoadingPulse";
import { MobileDrawer } from "./MobileDrawer";

type EntityDetailPanelProps = {
  entity: HistoryEntity;
  status: LoadStatus;
  panelState: "entering" | "open" | "exiting";
  contextLabel?: string;
  onBack: () => void;
  onClose: () => void;
};

export function EntityDetailPanel({
  entity,
  status,
  contextLabel,
  panelState,
  onBack,
  onClose,
}: EntityDetailPanelProps) {
  const years =
    entity.yearStart && entity.yearEnd
      ? `${entity.yearStart} – ${entity.yearEnd}`
      : entity.yearStart;

  const getEntityIcon = (kind: string) => {
    switch (kind) {
      case "person":
        return <User className="size-3" />;
      case "event":
        return <Calendar className="w-3 h-3" />;
      case "place":
        return <MapPin className="w-3 h-3" />;
      case "empire":
        return <Crown className="w-3 h-3" />;
      case "monument":
        return <Landmark className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const variants: Variants = {
    initial: {
      opacity: 0,
      x: 50,
      y: 0,
      scale: 0.78,
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
      },
    },
    exit: {
      opacity: 0,
      x: 50,
      y: 10,
      scale: 0.78,
      transition: {
        duration: 0.22,
        ease: "easeInOut",
      },
    },
  };

  return (
    <>
      {/* Mobile Entity Detail Drawer */}
      <MobileDrawer
        isOpen={panelState === "open"}
        onClose={onClose}
        onBack={onBack}
        title={entity.label}
        subtitle={entity.description}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.75 border border-gold/20 bg-gold/8 text-gold text-[10px] font-bold tracking-[0.12em] uppercase rounded-theme font-ui">
              {getEntityIcon(entity.kind)}
              {entity.kind}
            </span>
            {years && (
              <span className="inline-flex items-center gap-1.5 text-muted text-[10.5px] font-semibold tracking-[0.05em] font-dates">
                <Clock className="w-3 h-3 text-muted/70" />
                {years}
              </span>
            )}
          </div>
        }
      >
        {status === "loading" ? (
          <LoadingPulse label={`Loading ${entity.label}…`} />
        ) : null}

        {entity.imageUrl && status !== "loading" ? (
          <div className="mb-4 overflow-hidden border border-line/45 rounded-theme shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="block w-full h-auto transition-transform duration-500 hover:scale-[1.03]"
              src={entity.imageUrl}
              alt={entity.label}
            />
          </div>
        ) : null}

        {status !== "loading" ? (
          <p className="mb-4 text-[15px] leading-[1.6] font-body text-ink/90 selection:bg-gold/20 select-text">
            {entity.extract ??
              entity.description ??
              "A connected history node from public sources. Open the full article for more."}
          </p>
        ) : null}

        {entity.url ? (
          <a
            className="group inline-flex items-center gap-2 mt-2 px-3.5 py-2 border border-gold/30 hover:border-gold bg-gold/5 hover:bg-gold/10 text-gold text-[10.5px] font-bold tracking-[0.08em] no-underline uppercase rounded-theme font-ui transition-all duration-200 hover:shadow-xs"
            href={entity.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>Open full source</span>
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
        className="hidden md:block absolute z-24 top-[calc(var(--topbar-h)+14px)] right-4 w-(--panel-w) max-h-[calc(100vh-var(--topbar-h)-100px)] max-h-[calc(100dvh-var(--topbar-h)-100px)] overflow-y-auto custom-scrollbar p-[22px_24px_28px] border border-line bg-paper/94 shadow-[-10px_12px_36px_rgba(52,65,42,0.16)] backdrop-blur-xl overscroll-contain rounded-theme"
        aria-live="polite"
        aria-label={`${entity.label} details`}
      >
        <div className="flex justify-between items-center text-muted text-[10px] font-bold tracking-[0.14em] uppercase mb-4 font-ui">
          <button
            type="button"
            className="group inline-flex items-center gap-1.5 border-0 bg-transparent text-gold text-[11px] font-bold tracking-[0.08em] uppercase py-1 cursor-pointer transition-colors hover:text-gold/80 px-2"
            onClick={onBack}
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>{contextLabel ?? "Back"}</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center border-0 bg-transparent text-muted hover:text-ink w-6 h-6 rounded-full hover:bg-line/20 cursor-pointer transition-all duration-200"
            onClick={onClose}
            aria-label="Close details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="pb-4.5 border-b border-line">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.75 border border-gold/20 bg-gold/8 text-gold text-[10px] font-bold tracking-[0.12em] uppercase rounded-theme font-ui">
              {getEntityIcon(entity.kind)}
              {entity.kind}
            </span>
            {years && (
              <span className="inline-flex items-center gap-1.5 text-muted text-[10.5px] font-semibold tracking-[0.05em] font-dates">
                <Clock className="w-3 h-3 text-muted/70" />
                {years}
              </span>
            )}
          </div>
          <h1 className="m-0 font-medium text-[32px] max-sm:text-[26px] leading-[1.1] font-heading tracking-tight text-ink">
            {entity.label}
          </h1>
          {entity.description && (
            <div className="mt-2.5 pl-3 border-l-2 border-gold/30">
              <span className="block text-muted italic text-[13.5px] font-body leading-relaxed">
                {entity.description}
              </span>
            </div>
          )}
        </div>

        {status === "loading" ? (
          <LoadingPulse label={`Loading ${entity.label}…`} />
        ) : null}

        {entity.imageUrl && status !== "loading" ? (
          <div className="my-4 mb-2 overflow-hidden border border-line/45 rounded-theme shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="block w-full h-auto transition-transform duration-500 hover:scale-[1.03]"
              src={entity.imageUrl}
              alt={entity.label}
            />
          </div>
        ) : null}

        {status !== "loading" ? (
          <p className="my-4 text-[15px] leading-[1.6] font-body text-ink/90 selection:bg-gold/20">
            {entity.extract ??
              entity.description ??
              "A connected history node from public sources. Open the full article for more."}
          </p>
        ) : null}

        {entity.url ? (
          <a
            className="group inline-flex items-center gap-2 mt-2 px-3.5 py-2 border border-gold/30 hover:border-gold bg-gold/5 hover:bg-gold/10 text-gold text-[10.5px] font-bold tracking-[0.08em] no-underline uppercase rounded-theme font-ui transition-all duration-200 hover:shadow-xs"
            href={entity.url}
            target="_blank"
            rel="noreferrer"
          >
            <span>Open full source</span>
            <ExternalLink className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ) : null}
      </motion.aside>
    </>
  );
}
