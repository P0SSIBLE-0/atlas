"use client";

import type { TimelineEntry } from "../../lib/types";

type HistoryTimelineProps = {
  entries: TimelineEntry[];
  onSelect?: (entry: TimelineEntry) => void;
};

export function HistoryTimeline({ entries, onSelect }: HistoryTimelineProps) {
  if (entries.length === 0) return null;

  return (
    <section className="mt-4.5">
      <div className="flex justify-between items-center text-muted text-[10px] font-bold tracking-[0.14em] uppercase font-section">
        <span>History timeline</span>
        <small className="text-gold text-[9px]">{entries.length} moments</small>
      </div>
      <ol className="list-none mt-2.5 p-0 border-l-2 border-gold/35">
        {entries.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className="w-full grid grid-cols-[72px_1fr] gap-2.5 py-2 pl-3 border-0 bg-transparent text-left relative cursor-pointer group before:content-[''] before:absolute before:left-[-5px] before:top-3.5 before:w-2 before:h-2 before:rounded-full before:bg-gold before:shadow-[0_0_0_3px_var(--paper)]"
              onClick={() => onSelect?.(entry)}
            >
              <span className="text-gold font-bold text-[10px] leading-[1.3] font-dates tracking-[0.04em]">{entry.year}</span>
              <span className="block transition-transform duration-150 group-hover:translate-x-0.5">
                <b className="block text-ink font-body text-[13px]">{entry.label}</b>
                {entry.description ? <small className="block mt-0.5 text-muted font-ui text-[10px] leading-[1.35]">{entry.description}</small> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
