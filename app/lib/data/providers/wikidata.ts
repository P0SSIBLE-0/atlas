import type { HistoryEntity } from "../../types";
import type { WikidataSearchResponse, SparqlBinding, SparqlResponse } from "../types";
import { fetchJson } from "../utils";
import { bindingToEntity } from "../normalizers/entity";
import { yearFromIso } from "../utils";

const qidCache = new Map<string, string | null>();

/** Resolve a free-text name to a Wikidata Q-id. */
export async function resolveWikidataId(
  query: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const key = query.trim().toLowerCase();
  if (!key) return null;
  if (qidCache.has(key)) return qidCache.get(key) ?? null;

  try {
    const encoded = encodeURIComponent(query.trim());
    const data = await fetchJson<WikidataSearchResponse>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encoded}&language=en&limit=5&format=json&origin=*`,
      signal,
    );
    const hit =
      data.search?.find((item) =>
        /country|sovereign state|state|city|town|capital|monument|building|human settlement|archaeological/i.test(
          item.description ?? "",
        ),
      ) ?? data.search?.[0];
    const id = hit?.id ?? null;
    qidCache.set(key, id);
    return id;
  } catch (err) {
    // Only cache a permanent null when the signal was intentionally aborted.
    // Network errors / timeouts must NOT be cached — the next click should retry.
    const isAbort = err instanceof Error && err.name === "AbortError";
    if (!isAbort) {
      // transient failure — do not cache, let the next call try again
      return null;
    }
    return null;
  }
}

async function sparql(query: string, signal?: AbortSignal): Promise<SparqlBinding[]> {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const data = await fetchJson<SparqlResponse>(url, signal, {
    Accept: "application/sparql-results+json",
  });
  return data.results?.bindings ?? [];
}

export async function fetchCountryPeople(
  qid: string,
  signal?: AbortSignal,
): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?birth ?death ?image ?links WHERE {
      ?item wdt:P27 wd:${qid} ;
            wdt:P31 wd:Q5 ;
            wikibase:sitelinks ?links .
      FILTER(?links >= 15)
      OPTIONAL { ?item wdt:P569 ?birth . }
      OPTIONAL { ?item wdt:P570 ?death . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?links)
    LIMIT 12
  `;
  try {
    const rows = await sparql(query, signal);
    return rows
      .map((row) => bindingToEntity(row, "person"))
      .filter((item): item is HistoryEntity => Boolean(item));
  } catch {
    return [];
  }
}

export async function fetchCountryEvents(
  qid: string,
  signal?: AbortSignal,
): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      ?item wdt:P17 wd:${qid} ;
            wdt:P31 ?type .
      VALUES ?type { wd:Q1190554 wd:Q178561 wd:Q131569 wd:Q10931 wd:Q198 wd:Q386724 }
      OPTIONAL { ?item wdt:P585 ?date . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?date)
    LIMIT 12
  `;
  try {
    const rows = await sparql(query, signal);
    return rows
      .map((row) => bindingToEntity(row, "event"))
      .filter((item): item is HistoryEntity => Boolean(item));
  } catch {
    return [];
  }
}

export async function fetchCountryEmpires(
  qid: string,
  signal?: AbortSignal,
): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?inception ?dissolved ?image WHERE {
      ?item wdt:P17 wd:${qid} ;
            wdt:P31 ?type .
      VALUES ?type { wd:Q3024240 wd:Q4830453 wd:Q12473 wd:Q201819 }
      OPTIONAL { ?item wdt:P571 ?inception . }
      OPTIONAL { ?item wdt:P576 ?dissolved . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 10
  `;
  try {
    const rows = await sparql(query, signal);
    const mapped: HistoryEntity[] = [];
    for (const row of rows) {
      const entity = bindingToEntity(row, "empire");
      if (!entity) continue;
      mapped.push({
        ...entity,
        yearStart: yearFromIso(row.inception?.value) ?? entity.yearStart,
        yearEnd: yearFromIso(row.dissolved?.value) ?? entity.yearEnd,
      });
    }
    // de-dupe
    const seen = new Set<string>();
    return mapped
      .filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export async function fetchFamousPlaces(
  qid: string,
  signal?: AbortSignal,
): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?coord ?image ?links WHERE {
      ?item wdt:P17 wd:${qid} ;
            wdt:P31 ?type ;
            wikibase:sitelinks ?links .
      VALUES ?type { wd:Q570116 wd:Q4989906 wd:Q8347141 wd:Q125553 wd:Q9088 wd:Q11276 wd:Q205142 wd:Q200744 wd:Q47672 }
      OPTIONAL { ?item wdt:P625 ?coord . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?links)
    LIMIT 16
  `;
  try {
    const rows = await sparql(query, signal);
    const seen = new Set<string>();
    const places: HistoryEntity[] = [];
    for (const row of rows) {
      const entity = bindingToEntity(row, "monument");
      if (!entity || seen.has(entity.id)) continue;
      seen.add(entity.id);
      places.push(entity);
    }
    return places.slice(0, 14);
  } catch {
    return [];
  }
}

export async function fetchPlacePeople(
  qid: string,
  signal?: AbortSignal,
): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?birth ?death ?image WHERE {
      {
        ?item wdt:P19 wd:${qid} .
      } UNION {
        ?item wdt:P20 wd:${qid} .
      } UNION {
        ?item wdt:P551 wd:${qid} .
      }
      ?item wdt:P31 wd:Q5 .
      OPTIONAL { ?item wdt:P569 ?birth . }
      OPTIONAL { ?item wdt:P570 ?death . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 12
  `;
  try {
    const rows = await sparql(query, signal);
    const seen = new Set<string>();
    const people: HistoryEntity[] = [];
    for (const row of rows) {
      const entity = bindingToEntity(row, "person");
      if (!entity || seen.has(entity.id)) continue;
      seen.add(entity.id);
      people.push(entity);
    }
    return people.slice(0, 10);
  } catch {
    return [];
  }
}

export async function fetchPlaceEvents(
  qid: string,
  signal?: AbortSignal,
): Promise<HistoryEntity[]> {
  const query = `
    SELECT ?item ?itemLabel ?itemDescription ?date ?image WHERE {
      {
        ?item wdt:P276 wd:${qid} .
      } UNION {
        ?item wdt:P131 wd:${qid} ;
              wdt:P31/wdt:P279* wd:Q1190554 .
      }
      OPTIONAL { ?item wdt:P585 ?date . }
      OPTIONAL { ?item wdt:P18 ?image . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    ORDER BY DESC(?date)
    LIMIT 12
  `;
  try {
    const rows = await sparql(query, signal);
    return rows
      .map((row) => bindingToEntity(row, "event"))
      .filter((item): item is HistoryEntity => Boolean(item));
  } catch {
    return [];
  }
}
