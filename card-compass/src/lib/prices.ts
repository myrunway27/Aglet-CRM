import type { CatalogCardWithPrices } from "./catalog/types";
import { safeSourceUrl } from "./safe-url";
import { toMinor, type Currency } from "./money";

export type SourceId = "tcgplayer" | "cardmarket";

export const SOURCES: Record<SourceId, { label: string; currency: Currency; region: string }> = {
  tcgplayer: { label: "TCGplayer", currency: "USD", region: "US" },
  cardmarket: { label: "Cardmarket", currency: "EUR", region: "EU" },
};

export interface PriceReference {
  source: SourceId;
  sourceCardUrl: string | null;
  currency: Currency;
  amountMinor: number;
  subtype: string;
  finish: string;
  observedAt: string; // ISO
  fetchedAt: string; // ISO
  stale: boolean;
  isDemo: boolean;
}

export interface SourceStatus {
  source: SourceId;
  label: string;
  currency: Currency;
  status: "ok" | "no-quote";
  observedAt: string | null;
  sourceCardUrl: string | null;
  stale: boolean;
}

export const SUBTYPE_LABELS: Record<string, string> = {
  market: "Market price",
  low: "Low",
  mid: "Mid",
  high: "High",
  directLow: "Direct low",
  trend: "Trend price",
  averageSell: "Average sell price",
  lowExPlus: "Low (EX+ condition)",
  avg1: "1-day average",
  avg7: "7-day average",
  avg30: "30-day average",
};
export const subtypeLabel = (s: string) => SUBTYPE_LABELS[s] ?? s;

const TCGPLAYER_SUBTYPES = ["market", "low", "mid", "high", "directLow"] as const;

/** Cardmarket fields from the Pokémon TCG API mapped to (finish, subtype). */
const CARDMARKET_FIELDS: Record<string, { finish: string; subtype: string }> = {
  trendPrice: { finish: "unspecified", subtype: "trend" },
  averageSellPrice: { finish: "unspecified", subtype: "averageSell" },
  lowPrice: { finish: "unspecified", subtype: "low" },
  lowPriceExPlus: { finish: "unspecified", subtype: "lowExPlus" },
  avg1: { finish: "unspecified", subtype: "avg1" },
  avg7: { finish: "unspecified", subtype: "avg7" },
  avg30: { finish: "unspecified", subtype: "avg30" },
  reverseHoloTrend: { finish: "reverseHolofoil", subtype: "trend" },
  reverseHoloSell: { finish: "reverseHolofoil", subtype: "averageSell" },
  reverseHoloLow: { finish: "reverseHolofoil", subtype: "low" },
  reverseHoloAvg1: { finish: "reverseHolofoil", subtype: "avg1" },
  reverseHoloAvg7: { finish: "reverseHolofoil", subtype: "avg7" },
  reverseHoloAvg30: { finish: "reverseHolofoil", subtype: "avg30" },
};

/** Parse "2026/09/27" (API format) or ISO into an ISO timestamp; null if invalid. */
export function parseSourceDate(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})/.exec(raw.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function isStale(observedAtIso: string, nowMs: number, staleAfterDays: number): boolean {
  return nowMs - Date.parse(observedAtIso) > staleAfterDays * 86_400_000;
}

/**
 * Convert the provider's price blocks into source-tagged references. Missing,
 * zero or undated values are dropped (the UI shows "No quote available").
 */
export function toReferences(
  data: CatalogCardWithPrices,
  opts: { now: number; staleAfterDays: number },
): { references: PriceReference[]; sources: SourceStatus[] } {
  const fetchedAt = new Date(opts.now).toISOString();
  const refs: PriceReference[] = [];

  const tcg = data.tcgplayer;
  const tcgObserved = parseSourceDate(tcg?.updatedAt);
  const tcgUrl = safeSourceUrl(tcg?.url);
  if (tcg?.prices && tcgObserved) {
    for (const [finish, block] of Object.entries(tcg.prices)) {
      if (!block) continue;
      for (const subtype of TCGPLAYER_SUBTYPES) {
        const minor = toMinor(block[subtype]);
        if (minor === null) continue;
        refs.push({
          source: "tcgplayer",
          sourceCardUrl: tcgUrl,
          currency: "USD",
          amountMinor: minor,
          subtype,
          finish,
          observedAt: tcgObserved,
          fetchedAt,
          stale: isStale(tcgObserved, opts.now, opts.staleAfterDays),
          isDemo: data.isDemo,
        });
      }
    }
  }

  const cm = data.cardmarket;
  const cmObserved = parseSourceDate(cm?.updatedAt);
  const cmUrl = safeSourceUrl(cm?.url);
  if (cm?.prices && cmObserved) {
    for (const [field, map] of Object.entries(CARDMARKET_FIELDS)) {
      const minor = toMinor(cm.prices[field]);
      if (minor === null) continue;
      refs.push({
        source: "cardmarket",
        sourceCardUrl: cmUrl,
        currency: "EUR",
        amountMinor: minor,
        subtype: map.subtype,
        finish: map.finish,
        observedAt: cmObserved,
        fetchedAt,
        stale: isStale(cmObserved, opts.now, opts.staleAfterDays),
        isDemo: data.isDemo,
      });
    }
  }

  const sources: SourceStatus[] = (Object.keys(SOURCES) as SourceId[]).map((source) => {
    const has = refs.find((r) => r.source === source);
    const observedAt = source === "tcgplayer" ? tcgObserved : cmObserved;
    return {
      source,
      label: SOURCES[source].label,
      currency: SOURCES[source].currency,
      status: has ? "ok" : "no-quote",
      observedAt: has ? observedAt : null,
      sourceCardUrl: has ? (source === "tcgplayer" ? tcgUrl : cmUrl) : null,
      stale: has ? has.stale : false,
    };
  });

  return { references: refs, sources };
}

/**
 * Split one source's references relative to the finish the buyer confirmed.
 * References for a different finish are never substituted for the chosen one.
 */
export function groupByFinish(refs: PriceReference[], finish: string) {
  return {
    exact: refs.filter((r) => r.finish === finish),
    notFinishSpecific: refs.filter((r) => r.finish === "unspecified"),
    otherFinishes: refs.filter((r) => r.finish !== finish && r.finish !== "unspecified"),
  };
}
