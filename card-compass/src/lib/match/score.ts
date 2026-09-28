import type { Candidate, CatalogCard, MatchConfidence } from "../types";
import { normalizeNumber, type ScanClues } from "./parse";

export function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function bigrams(s: string): string[] {
  const t = s.replace(/\s+/g, "");
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
}

/** Sørensen–Dice coefficient on character bigrams (0..1). */
export function similarity(a: string, b: string): number {
  const x = bigrams(normalizeName(a));
  const y = bigrams(normalizeName(b));
  if (x.length === 0 || y.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of x) counts.set(g, (counts.get(g) ?? 0) + 1);
  let overlap = 0;
  for (const g of y) {
    const n = counts.get(g) ?? 0;
    if (n > 0) {
      overlap++;
      counts.set(g, n - 1);
    }
  }
  return (2 * overlap) / (x.length + y.length);
}

export const MAX_CANDIDATES = 5;

export function scoreCard(card: CatalogCard, clues: ScanClues): Candidate {
  let score = 0;
  const reasons: string[] = [];
  const fullText = ` ${normalizeName(clues.lines.join(" "))} `;

  if (clues.number && normalizeNumber(card.number) === normalizeNumber(clues.number)) {
    score += 50;
    reasons.push(`Collector number ${card.number} matches “${clues.numberRaw ?? clues.number}”`);
  }
  if (clues.printedTotal !== null && card.setPrintedTotal === clues.printedTotal) {
    score += 20;
    reasons.push(`Set size ${card.setPrintedTotal} matches`);
  }
  const code = card.setCode?.toUpperCase();
  if (code && clues.setCodes.includes(code)) {
    score += 20;
    reasons.push(`Set code ${code} found on card`);
  }

  const cardName = normalizeName(card.name);
  const nameGuesses = [clues.name, ...clues.nameAlternates].filter((n): n is string => !!n);
  if (cardName && (fullText.includes(` ${cardName} `) || nameGuesses.some((n) => normalizeName(n) === cardName))) {
    score += 30;
    reasons.push(`Name “${card.name}” found in text`);
  } else {
    const best = Math.max(0, ...nameGuesses.map((n) => similarity(n, card.name)));
    if (best >= 0.7) {
      score += 15;
      reasons.push(`Name similar to “${card.name}” (${Math.round(best * 100)}%)`);
    }
  }

  return { card, score, reasons };
}

export interface MatchResult {
  candidates: Candidate[];
  confidence: MatchConfidence;
  ambiguous: boolean;
  message: string;
}

export function rankCandidates(cards: CatalogCard[], clues: ScanClues): MatchResult {
  const unique = new Map(cards.map((c) => [c.catalogId, c]));
  const scored = [...unique.values()]
    .map((c) => scoreCard(c, clues))
    // Require real evidence: a number or a name signal, not just a set-size coincidence.
    .filter((c) => c.reasons.some((r) => r.startsWith("Collector") || r.startsWith("Name")))
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.card.setReleaseDate ?? "").localeCompare(a.card.setReleaseDate ?? "") ||
        a.card.catalogId.localeCompare(b.card.catalogId),
    )
    .slice(0, MAX_CANDIDATES);

  const top = scored[0];
  if (!top) {
    return {
      candidates: [],
      confidence: "none",
      ambiguous: false,
      message: "No catalog match. Try a clearer photo or search by name.",
    };
  }
  const margin = top.score - (scored[1]?.score ?? 0);
  const ambiguous = scored.length > 1 && margin < 10;
  const confidence: MatchConfidence =
    top.score >= 90 && margin >= 20 ? "high" : top.score >= 50 && margin >= 10 ? "medium" : "low";
  const message = ambiguous
    ? "Several printings match equally well. Check the set symbol, set code and number on your card."
    : confidence === "high"
      ? "Strong match. Please confirm the exact printing before seeing prices."
      : "Possible matches. Please pick the exact printing or search manually.";
  return { candidates: scored, confidence, ambiguous, message };
}
