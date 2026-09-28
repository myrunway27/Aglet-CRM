import { TtlCache } from "../cache";
import { UpstreamError } from "../errors";
import type { FetchLike } from "../http";
import type { FxProvider, FxRates } from "./types";

export const ECB_DAILY_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

/** Parse the ECB daily reference-rate XML. Throws if the date or rates are missing. */
export function parseEcbXml(xml: string): FxRates {
  const date = /<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]/.exec(xml)?.[1];
  const rates: Record<string, number> = {};
  for (const m of xml.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9.]+)['"]/g)) {
    const r = Number(m[2]);
    if (Number.isFinite(r) && r > 0) rates[m[1]] = r;
  }
  if (!date || Object.keys(rates).length === 0) throw new UpstreamError("ECB rates could not be parsed");
  return { base: "EUR", date, rates, source: "ECB", sourceUrl: ECB_DAILY_URL };
}

/** European Central Bank euro foreign exchange reference rates (published once per working day). */
export class EcbFxProvider implements FxProvider {
  readonly id = "ecb" as const;
  private cache = new TtlCache<FxRates>(6 * 3_600_000, 7 * 86_400_000);

  constructor(
    private readonly timeoutMs = 8000,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async getRates(): Promise<FxRates> {
    const hit = this.cache.get("daily");
    if (hit?.fresh) return hit.value;
    try {
      const res = await this.fetchImpl(ECB_DAILY_URL, { signal: AbortSignal.timeout(this.timeoutMs) });
      if (!res.ok) throw new UpstreamError(`ECB error ${res.status}`, res.status, res.status >= 500);
      const fx = parseEcbXml(await res.text());
      this.cache.set("daily", fx);
      return fx;
    } catch (err) {
      if (hit) return hit.value; // stale-if-error; callers check the date
      throw err instanceof UpstreamError ? err : new UpstreamError("ECB rates unavailable", undefined, true);
    }
  }
}
