import type { CountryMeta } from "../../types";
import type { RestCountry } from "../types";
import { fetchJson } from "../utils";

const countryCache = new Map<string, CountryMeta>();

/** Country facts from REST Countries (open data). */
export async function getCountryMeta(
  countryName: string,
  signal?: AbortSignal,
): Promise<CountryMeta | null> {
  const key = countryName.trim().toLowerCase();
  if (!key) return null;
  const cached = countryCache.get(key);
  if (cached) return cached;

  const encoded = encodeURIComponent(countryName.trim());
  const urls = [
    `/api/proxy/restcountries/name/${encoded}?fullText=true`,
    `/api/proxy/restcountries/name/${encoded}`,
  ];

  for (const url of urls) {
    try {
      const data = await fetchJson<RestCountry[]>(url, signal);
      const match =
        data.find((item) => item.name?.common?.toLowerCase() === key) ?? data[0];
      if (!match) continue;

      const meta: CountryMeta = {
        name: match.name?.common ?? countryName,
        officialName: match.name?.official,
        region: match.region,
        subregion: match.subregion,
        capital: match.capital?.[0],
        population: match.population,
        area: match.area,
        languages: match.languages ? Object.values(match.languages) : undefined,
        currencies: match.currencies
          ? Object.values(match.currencies)
              .map((c) => c.name ?? "")
              .filter(Boolean)
          : undefined,
        flagPng: match.flags?.png,
        flagAlt: match.flags?.alt ?? `Flag of ${match.name?.common ?? countryName}`,
        latlng: match.latlng,
        borders: match.borders,
        timezones: match.timezones?.slice(0, 4),
      };
      countryCache.set(key, meta);
      return meta;
    } catch {
      // try next URL
    }
  }
  return null;
}
