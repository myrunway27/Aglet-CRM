import { safeSourceUrl } from "../safe-url";
import type { Finish, PriceReference } from "../types";
import { toMinor } from "./format";

const TCG_FINISHES: Finish[] = [
  "normal",
  "holofoil",
  "reverseHolofoil",
  "1stEditionNormal",
  "1stEditionHolofoil",
  "unlimitedHolofoil",
];

const TCG_SUBTYPES: Array<[key: string, label: string]> = [
  ["market", "Market price"],
  ["low", "Low"],
  ["mid", "Mid"],
  ["high", "High"],
];

const CM_STANDARD: Array<[key: string, subtype: string, label: string]> = [
  ["trendPrice", "trend", "Trend price"],
  ["averageSellPrice", "averageSell", "Average sell price"],
  ["lowPrice", "low", "Lowest price"],
  ["avg30", "avg30", "30-day average"],
];

const CM_REVERSE: Array<[key: string, subtype: string, label: string]> = [
  ["reverseHoloTrend", "trend", "Trend price"],
  ["reverseHoloSell", "averageSell", "Average sell price"],
  ["reverseHoloLow", "low", "Lowest price"],
  ["reverseHoloAvg30", "avg30", "30-day average"],
];

/** Pokémon TCG API dates look like "2026/09/27". Returns ISO or null. */
export function parseSourceDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Cardmarket's non-reverse fields are one price per product, not per finish.
 * Attribute them to the card's single non-reverse finish when there is exactly one.
 */
export function standardFinish(finishes: Finish[]): Finish | null {
  const std = finishes.filter((f) => f !== "reverseHolofoil");
  return std.length === 1 ? (std[0] ?? null) : null;
}

export function extractPriceReferences(card: unknown, finishes: Finish[], demo = false): PriceReference[] {
  if (!isRecord(card)) return [];
  const refs: PriceReference[] = [];

  const tcg = card.tcgplayer;
  if (isRecord(tcg) && isRecord(tcg.prices)) {
    const observedAt = parseSourceDate(tcg.updatedAt);
    const sourceUrl = safeSourceUrl(tcg.url);
    if (observedAt) {
      for (const finish of TCG_FINISHES) {
        const p = tcg.prices[finish];
        if (!isRecord(p)) continue;
        for (const [key, label] of TCG_SUBTYPES) {
          const amountMinor = toMinor(p[key], "USD");
          if (amountMinor === null) continue;
          refs.push({
            source: "tcgplayer",
            sourceLabel: "TCGplayer",
            sourceUrl,
            currency: "USD",
            amountMinor,
            subtype: key,
            subtypeLabel: label,
            finish,
            observedAt,
            demo,
          });
        }
      }
    }
  }

  const cm = card.cardmarket;
  if (isRecord(cm) && isRecord(cm.prices)) {
    const observedAt = parseSourceDate(cm.updatedAt);
    const sourceUrl = safeSourceUrl(cm.url);
    const std = standardFinish(finishes);
    if (observedAt) {
      const push = (finish: Finish, rows: typeof CM_STANDARD, note?: string) => {
        for (const [key, subtype, label] of rows) {
          const amountMinor = toMinor((cm.prices as Record<string, unknown>)[key], "EUR");
          if (amountMinor === null) continue;
          refs.push({
            source: "cardmarket",
            sourceLabel: "Cardmarket",
            sourceUrl,
            currency: "EUR",
            amountMinor,
            subtype,
            subtypeLabel: label,
            finish,
            observedAt,
            demo,
            ...(note ? { note } : {}),
          });
        }
      };
      if (std) push(std, CM_STANDARD, "Cardmarket reports one non-reverse price per product.");
      if (finishes.includes("reverseHolofoil")) push("reverseHolofoil", CM_REVERSE);
    }
  }

  return refs;
}

/** Finishes present in the catalog record (from tcgplayer price keys, when any). */
export function finishesFromCard(card: unknown): Finish[] {
  if (!isRecord(card)) return [];
  const tcg = card.tcgplayer;
  const out = new Set<Finish>();
  if (isRecord(tcg) && isRecord(tcg.prices)) {
    for (const f of TCG_FINISHES) if (isRecord(tcg.prices[f])) out.add(f);
  }
  return [...out];
}
