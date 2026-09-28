import type { CatalogCard, CatalogProvider } from "../catalog/types";
import { normalizeName, normalizeNumber, similarity } from "./normalize";
import type { ParsedCardText } from "./parse";

export type Confidence = "high" | "medium" | "low";

export interface Candidate {
  card: CatalogCard;
  score: number;
  confidence: Confidence;
  reasons: string[];
}

export interface MatchResult {
  candidates: Candidate[];
  /** True when the top candidates are too close to tell apart. */
  ambiguous: boolean;
  /** Several printings share name + number (e.g. reprints / duplicate artwork). */
  duplicatePrintings: boolean;
}

export const MAX_CANDIDATES = 5;

export function scoreCandidate(card: CatalogCard, parsed: ParsedCardText): Candidate {
  let score = 0;
  const reasons: string[] = [];

  if (parsed.number) {
    if (normalizeNumber(card.number) === normalizeNumber(parsed.number)) {
      score += 40;
      reasons.push(`Collector number ${card.number} matches`);
    } else {
      score -= 10;
      reasons.push(`Collector number differs (scan ${parsed.number}, catalog ${card.number})`);
    }
  }
  if (parsed.setTotal !== null) {
    if (card.setPrintedTotal === parsed.setTotal) {
      score += 25;
      reasons.push(`Set size /${parsed.setTotal} matches ${card.setName}`);
    } else if (card.setPrintedTotal !== null) {
      score -= 10;
      reasons.push(`Set size differs (scan /${parsed.setTotal}, ${card.setName} /${card.setPrintedTotal})`);
    }
  }
  if (parsed.name) {
    const a = normalizeName(parsed.name);
    const b = normalizeName(card.name);
    const sim = similarity(a, b);
    if (a === b) {
      score += 30;
      reasons.push("Name matches");
    } else if (sim >= 0.75 || b.startsWith(a) || a.startsWith(b)) {
      score += 15;
      reasons.push(`Name is similar ("${parsed.name}" vs "${card.name}")`);
    } else if (sim < 0.5) {
      score -= 20;
      reasons.push(`Name differs from scan ("${parsed.name}")`);
    }
  }

  const confidence: Confidence = score >= 90 ? "high" : score >= 55 ? "medium" : "low";
  return { card, score, confidence, reasons };
}

export function rankCandidates(cards: CatalogCard[], parsed: ParsedCardText): MatchResult {
  const unique = new Map<string, CatalogCard>();
  for (const c of cards) unique.set(c.catalogId, c);
  const ranked = [...unique.values()]
    .map((c) => scoreCandidate(c, parsed))
    .filter((c) => c.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || (b.card.releaseDate ?? "").localeCompare(a.card.releaseDate ?? ""),
    )
    .slice(0, MAX_CANDIDATES);

  const ambiguous = ranked.length > 1 && ranked[0].score - ranked[1].score < 10;
  const key = (c: CatalogCard) => `${normalizeName(c.name)}#${normalizeNumber(c.number)}`;
  const keys = ranked.map((c) => key(c.card));
  const duplicatePrintings = new Set(keys).size < keys.length;
  return { candidates: ranked, ambiguous, duplicatePrintings };
}

/**
 * Query the catalog with combined clues, most specific first, then rank.
 * Never selects a card: the buyer must confirm one explicitly.
 */
export async function findCandidates(
  parsed: ParsedCardText,
  catalog: CatalogProvider,
): Promise<MatchResult> {
  const found: CatalogCard[] = [];
  if (parsed.number && parsed.setTotal !== null) {
    found.push(...(await catalog.searchByClues({ number: parsed.number, setTotal: parsed.setTotal })));
  }
  if (parsed.number && parsed.name) {
    found.push(...(await catalog.searchByClues({ number: parsed.number, name: parsed.name })));
  }
  const strong = found.some((c) => scoreCandidate(c, parsed).confidence === "high");
  if (parsed.name && !strong) {
    found.push(...(await catalog.searchByClues({ name: parsed.name })));
  }
  if (parsed.number && !parsed.name && parsed.setTotal === null) {
    found.push(...(await catalog.searchByClues({ number: parsed.number })));
  }
  return rankCandidates(found, parsed);
}
