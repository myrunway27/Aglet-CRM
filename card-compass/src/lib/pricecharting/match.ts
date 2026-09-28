import type { CatalogCard } from "../catalog/types";
import { normalizeName, normalizeNumber, similarity } from "../matching/normalize";
import { toMinor } from "../money";
import type { PriceReference } from "../prices";

/** A PriceCharting product; prices are integer pennies (USD) keyed by API field name. */
export interface PcProduct {
  id: string;
  productName: string;
  consoleName: string;
  prices: Record<string, number | null | undefined>;
}

/**
 * PriceCharting's trading-card price fields, per its API documentation
 * (card grades reuse the video-game field names). Re-verify before launch.
 */
export const PC_FIELDS: Record<string, string> = {
  ungraded: "loose-price",
  grade7: "cib-price",
  grade8: "new-price",
  grade9: "graded-price",
  grade9_5: "box-only-price",
  psa10: "manual-only-price",
  bgs10: "bgs-10-price",
  cgc10: "condition-17-price",
  sgc10: "condition-18-price",
};

/** "Pikachu [Reverse Holo] #25" -> { name, variant, number } */
export function parseProductName(s: string): { name: string; variant: string | null; number: string | null } {
  const m = /^(.*?)\s*(?:\[([^\]]+)\])?\s*(?:#\s*([A-Za-z0-9-]+))?\s*$/.exec(s.trim());
  return { name: (m?.[1] ?? s).trim(), variant: m?.[2]?.trim() ?? null, number: m?.[3] ?? null };
}

const setKey = (s: string) => normalizeName(s.replace(/^pok[eé]mon\s+/i, ""));

export type PcMatch = { product: PcProduct; note: string } | { product: null; note: string };

/**
 * Pick the product for this exact card and finish. Name, collector number,
 * set and variant must all agree; if more than one product still fits, we
 * return no match rather than guess.
 */
export function matchProduct(products: PcProduct[], card: CatalogCard, finish: string): PcMatch {
  const wantName = normalizeName(card.name);
  const wantNum = normalizeNumber(card.number);
  const wantSet = setKey(card.setName);
  const fits = products.filter((p) => {
    const n = parseProductName(p.productName);
    if (normalizeName(n.name) !== wantName) return false;
    if (!n.number || normalizeNumber(n.number) !== wantNum) return false;
    const got = setKey(p.consoleName);
    if (got !== wantSet && similarity(got, wantSet) < 0.8) return false;
    const v = (n.variant ?? "").toLowerCase();
    const reverse = v.includes("reverse");
    const first = v.includes("1st edition");
    if ((finish === "reverseHolofoil") !== reverse) return false;
    if (finish.startsWith("1stEdition") !== first) return false;
    // Any other variant tag (stamped, staff, prerelease...) is a different printing.
    const rest = v.replace(/reverse holo|1st edition|holo/g, "").trim();
    return rest === "";
  });
  if (fits.length === 1) return { product: fits[0], note: "Matched on name, number, set and variant" };
  if (fits.length === 0) return { product: null, note: "No PriceCharting product matches this exact printing" };
  return { product: null, note: "Several PriceCharting products match; not guessing" };
}

export function productToReferences(p: PcProduct, finish: string, now: number, isDemo: boolean): PriceReference[] {
  const day = new Date(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z").toISOString();
  const out: PriceReference[] = [];
  for (const [subtype, field] of Object.entries(PC_FIELDS)) {
    const pennies = p.prices[field];
    const minor = typeof pennies === "number" ? toMinor(pennies / 100, "USD") : null;
    if (minor === null) continue;
    out.push({
      source: "pricecharting",
      sourceCardUrl: null,
      currency: "USD",
      amountMinor: minor,
      subtype,
      finish,
      observedAt: day,
      fetchedAt: new Date(now).toISOString(),
      stale: false,
      isDemo,
    });
  }
  return out;
}

/** Which PriceCharting subtype values a card with this grade. */
export function subtypeForGrade(grader: string | null | undefined, grade: string | null | undefined): string | null {
  const g = Number(grade);
  if (!Number.isFinite(g)) return null;
  if (g === 10) {
    const k = (grader ?? "").toUpperCase();
    return k === "PSA" ? "psa10" : k === "BGS" ? "bgs10" : k === "CGC" ? "cgc10" : k === "SGC" ? "sgc10" : null;
  }
  if (g === 9.5) return "grade9_5";
  if (g === 9) return "grade9";
  if (g >= 8) return "grade8";
  if (g >= 7) return "grade7";
  return null;
}
