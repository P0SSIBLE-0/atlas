import type { AtlasPlace } from "../../types";
import { getPlaceDetails } from "../providers/wikipedia";

export async function enrichPlacesPreview(
  places: AtlasPlace[],
  signal?: AbortSignal,
  concurrency = 4,
): Promise<AtlasPlace[]> {
  const results = [...places];
  let index = 0;

  async function worker() {
    while (index < results.length) {
      const current = index;
      index += 1;
      if (signal?.aborted) return;
      results[current] = await getPlaceDetails(results[current], signal);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, places.length) }, () => worker()));
  return results;
}
