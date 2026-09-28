import fixture from "../../../fixtures/catalog.json";
import { NotFoundError } from "../errors";
import { mapApiCard, type ApiCard } from "./pokemontcg";
import type { CatalogCard, CatalogCardWithPrices, CatalogProvider, CatalogSearchClues } from "./types";
import { normalizeName, normalizeNumber } from "../matching/normalize";

const CARDS = (fixture as unknown as { cards: ApiCard[] }).cards;

/**
 * Offline provider backed by bundled DEMO fixtures. Mirrors the query semantics
 * of the live adapter (number / printed total / name prefix) so matching logic
 * is exercised identically. Every result is flagged isDemo.
 */
export class MockCatalogProvider implements CatalogProvider {
  readonly id = "mock" as const;
  constructor(private readonly cards: ApiCard[] = CARDS) {}

  async searchByClues(clues: CatalogSearchClues): Promise<CatalogCard[]> {
    if (!clues.name && !clues.number && !clues.setTotal) return [];
    const name = clues.name ? normalizeName(clues.name) : undefined;
    const number = clues.number ? normalizeNumber(clues.number) : undefined;
    return this.cards
      .filter((c) => (number ? normalizeNumber(c.number) === number : true))
      .filter((c) => (clues.setTotal ? c.set.printedTotal === clues.setTotal : true))
      .filter((c) => (name ? normalizeName(c.name).startsWith(name) : true))
      .map(mapApiCard);
  }

  async searchText(query: string): Promise<CatalogCard[]> {
    const m = /^\s*([A-Za-z]{0,4}\d{1,3})\s*\/\s*([A-Za-z]{0,4}\d{1,3})\s*$/.exec(query);
    if (m) return this.searchByClues({ number: m[1], setTotal: Number(m[2]) || undefined });
    const q = normalizeName(query);
    if (!q) return [];
    return this.cards.filter((c) => normalizeName(c.name).includes(q)).map(mapApiCard);
  }

  async getCard(catalogId: string): Promise<CatalogCardWithPrices> {
    const c = this.cards.find((x) => x.id === catalogId);
    if (!c) throw new NotFoundError("Card not found");
    return {
      card: mapApiCard(c),
      tcgplayer: c.tcgplayer ?? null,
      cardmarket: c.cardmarket ?? null,
      isDemo: true,
    };
  }
}
