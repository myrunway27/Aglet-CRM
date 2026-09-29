import fixture from "../../../fixtures/catalog.json";
import { NotFoundError } from "../errors";
import { mapApiCard, type ApiCard } from "./pokemontcg";
import { compareNumbers, type CatalogCard, type CatalogCardWithPrices, type CatalogProvider, type CatalogSearchClues } from "./types";
import { normalizeName, normalizeNumber } from "../matching/normalize";

const CARDS = (fixture as unknown as { cards: ApiCard[] }).cards;

/** The fixture dates were written as if "today" were this day. */
const FIXTURE_TODAY = Date.UTC(2026, 8, 28);

/** Shift a fixture date ("2026/09/27") so it keeps the same age relative to `now`. */
export function shiftFixtureDate(raw: string | undefined, now: number): string | undefined {
  if (!raw) return raw;
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(raw);
  if (!m) return raw;
  const days = Math.floor((now - FIXTURE_TODAY) / 86_400_000);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) + days * 86_400_000);
  return d.toISOString().slice(0, 10).replace(/-/g, "/");
}

/**
 * Offline provider backed by bundled DEMO fixtures. Mirrors the query semantics
 * of the live adapter (number / printed total / name prefix) so matching logic
 * is exercised identically. Every result is flagged isDemo.
 */
export class MockCatalogProvider implements CatalogProvider {
  readonly id = "mock" as const;
  constructor(
    private readonly cards: ApiCard[] = CARDS,
    private readonly now: () => number = Date.now,
  ) {}

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

  async getCards(catalogIds: string[]): Promise<CatalogCard[]> {
    const want = new Set(catalogIds);
    return this.cards.filter((c) => want.has(c.id)).map(mapApiCard);
  }

  async listSet(setId: string): Promise<CatalogCard[]> {
    return this.cards
      .filter((c) => c.set.id === setId)
      .map(mapApiCard)
      .sort((a, b) => compareNumbers(a.number, b.number));
  }

  async listByName(name: string): Promise<CatalogCard[]> {
    const q = normalizeName(name);
    if (!q) return [];
    return this.cards
      .filter((c) => normalizeName(c.name).startsWith(q))
      .map(mapApiCard)
      .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  }

  async getCard(catalogId: string): Promise<CatalogCardWithPrices> {
    const c = this.cards.find((x) => x.id === catalogId);
    if (!c) throw new NotFoundError("Card not found");
    // Demo dates move with the clock so the demo never goes stale (relative ages are kept).
    const now = this.now();
    return {
      card: mapApiCard(c),
      tcgplayer: c.tcgplayer ? { ...c.tcgplayer, updatedAt: shiftFixtureDate(c.tcgplayer.updatedAt, now) } : null,
      cardmarket: c.cardmarket ? { ...c.cardmarket, updatedAt: shiftFixtureDate(c.cardmarket.updatedAt, now) } : null,
      isDemo: true,
    };
  }
}
