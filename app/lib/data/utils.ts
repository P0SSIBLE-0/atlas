/** Shared primitives used by all data providers. No domain logic here. */

export async function fetchJson<T>(
  url: string,
  signal?: AbortSignal,
  headers?: HeadersInit,
): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json", ...headers },
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export type TimeoutResult<T> = {
  value: T;
  /** True when the timeout or abort won before the promise settled. */
  timedOut: boolean;
};

/** Resolve quickly; fall back if the network stalls. Reports whether the fallback was used. */
export function withTimeoutResult<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  signal?: AbortSignal,
): Promise<TimeoutResult<T>> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ value: fallback, timedOut: true });
      }
    }, ms);

    const onAbort = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({ value: fallback, timedOut: true });
      }
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ value, timedOut: false });
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({ value: fallback, timedOut: true });
        }
      });
  });
}

/** Resolve quickly; fall back if the network stalls. */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  signal?: AbortSignal,
): Promise<T> {
  return withTimeoutResult(promise, ms, fallback, signal).then((r) => r.value);
}

export function commonsThumb(url?: string, width = 240): string | undefined {
  if (!url) return undefined;
  if (url.includes("Special:FilePath")) {
    return `${url}${url.includes("?") ? "&" : "?"}width=${width}`;
  }
  return url;
}

export function parseWktPoint(value?: string): { lat: number; lng: number } | undefined {
  if (!value) return undefined;
  const match = /Point\(([-0-9.]+)\s+([-0-9.]+)\)/i.exec(value);
  if (!match) return undefined;
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng };
}

export function yearFromIso(value?: string): string | undefined {
  if (!value) return undefined;
  const match = /^(-?\d{1,6})/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  if (!Number.isFinite(year)) return undefined;
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

export function sortKeyFromIso(value?: string): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const match = /^(-?\d{1,6})/.exec(value);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export function qidFromUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  const match = /\/(Q\d+)$/.exec(uri);
  return match?.[1];
}

export function wikipediaUrlFromTitle(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

export function classifyRelated(description?: string, type?: string): import("../types").EntityKind {
  const text = `${description ?? ""} ${type ?? ""}`.toLowerCase();
  if (
    /\b(emperor|king|queen|ruler|president|prime minister|general|philosopher|poet|scientist|artist|sultan|pharaoh|leader|born|politician|writer|explorer|composer|painter|novelist|activist|soldier|diplomat|inventor|mathematician|physicist|chemist|biologist|historian|saint|pope|caliph|tsar|czar|prince|princess|duke|duchess|empress|dictator|revolutionary|abolitionist|singer|musician|actor|actress|architect|engineer|economist|jurist|judge|cardinal|bishop|monk|nun|warrior|commander|admiral|marshal|chancellor|minister|statesman|stateswoman)\b/.test(
      text,
    )
  ) {
    return "person";
  }
  // Wikipedia often uses "… (born 18xx)" or "… was a …" patterns for people
  if (/\b\d{3,4}\s*[–-]\s*\d{0,4}\b/.test(text) && /\b(was|is|were)\b/.test(text)) {
    return "person";
  }
  if (
    /\b(battle|war|treaty|revolution|independence|siege|massacre|coronation|founding|invasion|rebellion|event)\b/.test(
      text,
    )
  ) {
    return "event";
  }
  if (/\b(empire|dynasty|caliphate|kingdom|sultanate|republic|civilization)\b/.test(text)) {
    return "empire";
  }
  if (
    /\b(temple|monument|fort|palace|cathedral|mosque|pyramid|tomb|castle|museum|heritage)\b/.test(
      text,
    )
  ) {
    return "monument";
  }
  return "place";
}
