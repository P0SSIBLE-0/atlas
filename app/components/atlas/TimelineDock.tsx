"use client";

import { ERA_PERIODS, yearFromTimeline } from "../../lib/timeline";
import type { TimelineEntry } from "../../lib/types";

type TimelineDockProps = {
  visible: boolean;
  yearIndex: number;
  onChange: (index: number) => void;
  onSelectEntry?: (entry: TimelineEntry) => void;
  contextLabel?: string;
  entries?: TimelineEntry[];
};

import { motion } from "motion/react";

export function TimelineDock({
  visible,
  yearIndex,
  onChange,
  onSelectEntry,
  contextLabel,
  entries = [],
}: TimelineDockProps) {
  const hasHistory = entries.length > 0;
  const maxIndex = hasHistory ? entries.length - 1 : ERA_PERIODS.length - 1;
  const safeIndex = Math.max(0, Math.min(yearIndex, maxIndex));
  const { label: periodLabel, entry: activeEntry } = yearFromTimeline(safeIndex, entries);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={visible ? { opacity: 1, y: 0, pointerEvents: "auto" } : { opacity: 0, y: 16, pointerEvents: "none" }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="absolute rounded-theme z-15 left-0 right-0 mx-auto bottom-[18px] w-[min(720px,calc(100%-32px))] grid grid-cols-[100px_1fr_minmax(120px,180px)] max-md:grid-cols-[80px_1fr] max-md:bottom-3 items-center gap-4 p-[14px_18px] border border-line bg-paper/45 shadow-[0_10px_28px_rgba(38,50,42,0.16)] backdrop-blur-md"
      aria-label="Historical timeline"
    >
      <div className="flex flex-col">
        <span className="block text-muted text-[9px] font-bold tracking-[0.16em]">TIME</span>
        <strong className="block mt-1 text-[20px] font-dates leading-tight">{periodLabel}</strong>
      </div>

      <div className="flex flex-col gap-3 min-w-0">
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={safeIndex}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="Scrub historical time"
          className="w-full accent-gold cursor-pointer"
        />

        {hasHistory ? (
          <button
            type="button"
            className="flex items-center gap-1 w-full mt-1.5 p-[6px_8px] border border-line bg-white/75 text-muted text-[11px] leading-[1.4] font-body text-left whitespace-nowrap overflow-hidden text-ellipsis rounded-theme transition-all duration-120 ease hover:not-disabled:border-gold/55 hover:not-disabled:-translate-y-[1px] hover:not-disabled:cursor-pointer disabled:opacity-50"
            onClick={() => activeEntry && onSelectEntry?.(activeEntry)}
            disabled={!activeEntry}
          >
            <b className="text-ink">{activeEntry?.label ?? "Moment"}</b>
            {activeEntry?.description ? (
              <span className="overflow-hidden text-ellipsis"> — {activeEntry.description}</span>
            ) : (
              <span className="overflow-hidden text-ellipsis"> — open this moment</span>
            )}
            <em className="ml-auto text-gold not-italic shrink-0">→</em>
          </button>
        ) : (
          <div className="flex justify-between gap-0.5">
            {ERA_PERIODS.map((period, index) => (
              <button
                key={period.label}
                type="button"
                onClick={() => onChange(index)}
                className={`pt-1 border-0 bg-transparent text-[9px] cursor-pointer transition-colors duration-150 ${index === safeIndex ? "text-ink font-bold" : "text-muted hover:text-ink"}`}
              >
                {period.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pl-3 border-l border-line max-md:hidden">
        <span className="text-gold">✦</span>
        <p className="m-0 text-muted text-[11px] leading-[1.35] font-body">
          {hasHistory ? (
            <>
              Scrub to move through <b>{entries.length}</b> dated moments
              {contextLabel ? (
                <>
                  {" "}
                  near <b>{contextLabel}</b>
                </>
              ) : null}
              . Click the event to open it.
            </>
          ) : (
            <>
              Scrub eras to filter people & events
              {contextLabel ? (
                <>
                  {" "}
                  for <b>{contextLabel}</b>
                </>
              ) : null}
              .
            </>
          )}
        </p>
      </div>
    </motion.section>
  );
}
