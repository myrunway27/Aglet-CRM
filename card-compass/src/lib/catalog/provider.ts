import type { ScanClues } from "../match/parse";
import type { CatalogCard } from "../types";

export interface CatalogProvider {
  readonly id: "mock" | "pokemontcg";
  /** Candidate cards for OCR clues (unscored; the matcher ranks them). */
  findByClues(clues: ScanClues): Promise<CatalogCard[]>;
  /** Manual text search. */
  search(query: string): Promise<CatalogCard[]>;
  getCard(catalogId: string): Promise<CatalogCard | null>;
}

/** Keep search input to characters that appear in card names and numbers. */
export function sanitizeQuery(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'’.\-/&]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Split "pikachu 025/198" into a name part and a collector-number part. */
export function splitQuery(q: string): { name: string; number: string | null; printedTotal: number | null } {
  const m = /(?:^|\s)([A-Za-z]{0,4}\d{1,3})(?:\s?\/\s?([A-Za-z]{0,4}\d{1,3}))?(?=\s|$)/.exec(q);
  if (!m) return { name: q, number: null, printedTotal: null };
  const name = (q.slice(0, m.index) + " " + q.slice(m.index + m[0].length)).replace(/\s+/g, " ").trim();
  const tot = m[2] && /^\d+$/.test(m[2]) ? Number(m[2]) : null;
  return { name, number: m[1] ?? null, printedTotal: tot };
}
