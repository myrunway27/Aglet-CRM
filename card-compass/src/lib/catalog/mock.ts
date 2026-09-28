import { normalizeNumber, type ScanClues } from "../match/parse";
import { normalizeName, similarity } from "../match/score";
import { extractPriceReferences, finishesFromCard } from "../price/pokemontcg-prices";
import type { CatalogCard } from "../types";
import { MOCK_CARDS, MOCK_SETS, type MockCardRecord } from "./mock-data";
import { sanitizeQuery, splitQuery, type CatalogProvider } from "./provider";

function isoDaysAgo(now: Date, days: number): string {
  const d = new Date(now.getTime() - days * 86_400_000);
  return d.toISOString().slice(0, 10).replace(/-/g, "/");
}

export function mockToCatalogCard(rec: MockCardRecord, now: Date): CatalogCard {
  const set = MOCK_SETS.find((s) => s.id === rec.set);
  if (!set) throw new Error(`mock set ${rec.set} missing`);
  // Build a Pokémon-TCG-API-shaped record; no source URLs, since none exist for demo data.
  const apiShaped = {
    tcgplayer: rec.tcgplayer && { updatedAt: isoDaysAgo(now, rec.tcgplayer.ageDays), prices: rec.tcgplayer.prices },
    cardmarket: rec.cardmarket && { updatedAt: isoDaysAgo(now, rec.cardmarket.ageDays), prices: rec.cardmarket.prices },
  };
  const finishes = finishesFromCard(apiShaped);
  return {
    catalogId: `mock:${rec.id}`,
    name: rec.name,
    number: rec.number,
    setId: set.id,
    setName: set.name,
    setPrintedTotal: set.printedTotal,
    setCode: set.ptcgoCode,
    setReleaseDate: set.releaseDate.replace(/\//g, "-"),
    imageUrl: null,
    rarity: rec.rarity,
    finishes,
    prices: extractPriceReferences(apiShaped, finishes, true),
  };
}

export class MockCatalog implements CatalogProvider {
  readonly id = "mock" as const;
  constructor(private readonly now: () => Date = () => new Date()) {}

  private all(): CatalogCard[] {
    const now = this.now();
    return MOCK_CARDS.map((r) => mockToCatalogCard(r, now));
  }

  async findByClues(clues: ScanClues): Promise<CatalogCard[]> {
    const names = [clues.name, ...clues.nameAlternates].filter((n): n is string => !!n);
    const text = ` ${normalizeName(clues.lines.join(" "))} `;
    return this.all().filter(
      (c) =>
        (clues.number && normalizeNumber(c.number) === normalizeNumber(clues.number)) ||
        text.includes(` ${normalizeName(c.name)} `) ||
        names.some((n) => similarity(n, c.name) >= 0.7),
    );
  }

  async search(query: string): Promise<CatalogCard[]> {
    const q = sanitizeQuery(query);
    if (!q) return [];
    const { name, number, printedTotal } = splitQuery(q);
    const n = normalizeName(name);
    return this.all()
      .filter((c) => {
        if (number && normalizeNumber(c.number) !== normalizeNumber(number)) return false;
        if (printedTotal !== null && c.setPrintedTotal !== printedTotal) return false;
        if (!n) return true;
        const cn = normalizeName(c.name);
        return cn.includes(n) || normalizeName(c.setName).includes(n) || similarity(n, cn) >= 0.7;
      })
      .slice(0, 20);
  }

  async getCard(catalogId: string): Promise<CatalogCard | null> {
    return this.all().find((c) => c.catalogId === catalogId) ?? null;
  }
}
