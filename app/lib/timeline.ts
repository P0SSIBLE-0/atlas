import type { HistoryEntity, TimelineEntry } from "./types";

export type EraPeriod = {
  label: string;
  year: number;
};

/** Fixed era rail used when a place has no dated events yet. */
export const ERA_PERIODS: EraPeriod[] = [
  { label: "500 BCE", year: -500 },
  { label: "1 CE", year: 1 },
  { label: "500", year: 500 },
  { label: "1000", year: 1000 },
  { label: "1500", year: 1500 },
  { label: "1700", year: 1700 },
  { label: "1900", year: 1900 },
  { label: "Today", year: 2025 },
];

/** Parse display years like "1653" or "500 BCE" into numeric sort keys. */
export function parseDisplayYear(value?: string): number | null {
  if (!value) return null;
  const bce = /(-?\d+)\s*BCE/i.exec(value);
  if (bce) return -Math.abs(Number(bce[1]));
  const ce = /(-?\d+)/.exec(value);
  if (!ce) return null;
  const n = Number(ce[1]);
  return Number.isFinite(n) ? n : null;
}

export function entityTouchesYear(entity: HistoryEntity, year: number, window = 120): boolean {
  const start = parseDisplayYear(entity.yearStart);
  if (start == null) return false;
  const end = parseDisplayYear(entity.yearEnd) ?? start;
  const lo = Math.min(start, end) - window;
  const hi = Math.max(start, end) + window;
  return year >= lo && year <= hi;
}

export function filterEntitiesByYear(
  entities: HistoryEntity[],
  year: number,
): HistoryEntity[] {
  const dated = entities.filter((entity) => entityTouchesYear(entity, year));
  // Prefer dated matches; if none, keep a few undated so the panel never empties
  if (dated.length > 0) return dated;
  return entities.filter((entity) => !entity.yearStart).slice(0, 4);
}

export function activeTimelineEntry(
  entries: TimelineEntry[],
  index: number,
): TimelineEntry | null {
  if (!entries.length) return null;
  const safe = Math.max(0, Math.min(index, entries.length - 1));
  return entries[safe] ?? null;
}

/** Map a scrubber index onto a calendar year (era rail or dated entries). */
export function yearFromTimeline(
  index: number,
  entries: TimelineEntry[],
): { year: number; label: string; entry: TimelineEntry | null } {
  if (entries.length > 0) {
    const entry = activeTimelineEntry(entries, index);
    const year = parseDisplayYear(entry?.year) ?? ERA_PERIODS[4].year;
    return { year, label: entry?.year ?? String(year), entry };
  }
  const safe = Math.max(0, Math.min(index, ERA_PERIODS.length - 1));
  const period = ERA_PERIODS[safe];
  return { year: period.year, label: period.label, entry: null };
}
