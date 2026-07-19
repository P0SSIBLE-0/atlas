import type { EntityKind, HistoryEntity, AtlasPlace, TimelineEntry } from "../../types";
import type { SparqlBinding } from "../types";
import {
  commonsThumb,
  parseWktPoint,
  yearFromIso,
  sortKeyFromIso,
  qidFromUri,
} from "../utils";

export function bindingToEntity(
  row: SparqlBinding,
  kind: EntityKind,
  idKey = "item",
): HistoryEntity | null {
  const id = qidFromUri(row[idKey]?.value) ?? row[idKey]?.value;
  const label = row[`${idKey}Label`]?.value;
  if (!id || !label || label.startsWith("Q")) return null;

  const point = parseWktPoint(row.coord?.value);
  const yearStart = yearFromIso(row.date?.value ?? row.birth?.value ?? row.inception?.value);
  const yearEnd = yearFromIso(row.end?.value ?? row.death?.value ?? row.dissolved?.value);

  return {
    id,
    label,
    description: row[`${idKey}Description`]?.value,
    kind,
    imageUrl: commonsThumb(row.image?.value),
    yearStart,
    yearEnd,
    url: `https://www.wikidata.org/wiki/${id}`,
    latitude: point?.lat,
    longitude: point?.lng,
  };
}

export function buildTimeline(entities: HistoryEntity[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const entity of entities) {
    if (!entity.yearStart) continue;
    const isoGuess = entity.yearStart.includes("BCE")
      ? `-${entity.yearStart.replace(/\D/g, "")}`
      : entity.yearStart;
    entries.push({
      id: entity.id,
      label: entity.label,
      description: entity.description,
      year: entity.yearEnd ? `${entity.yearStart} – ${entity.yearEnd}` : entity.yearStart,
      sortKey: sortKeyFromIso(isoGuess),
      kind: entity.kind,
      url: entity.url,
    });
  }
  return entries.sort((a, b) => a.sortKey - b.sortKey).slice(0, 18);
}

export function mergeEntities(...lists: HistoryEntity[][]): HistoryEntity[] {
  const seen = new Set<string>();
  const merged: HistoryEntity[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = item.label.toLowerCase();
      if (seen.has(item.id) || seen.has(key)) continue;
      seen.add(item.id);
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

export function entitiesToMapPlaces(entities: HistoryEntity[]): AtlasPlace[] {
  return entities
    .filter((entity) => entity.latitude != null && entity.longitude != null)
    .map((entity) => ({
      id: entity.id,
      title: entity.label,
      description: entity.description,
      extract: entity.extract,
      thumbnailUrl: entity.imageUrl,
      url: entity.url,
      latitude: entity.latitude as number,
      longitude: entity.longitude as number,
      type: entity.kind === "monument" ? "landmark" : "place",
      wikidataId: entity.id.startsWith("Q") ? entity.id : undefined,
    }));
}
