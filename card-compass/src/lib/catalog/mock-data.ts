/**
 * DEMO catalog for local development and tests.
 *
 * Every set here is fictional ("Demo Set …") and every price is an invented
 * fixture value flagged `demo: true`. They exist so the UI and tests can run
 * without credentials. They are not market data and must never be shown as such.
 * Records mirror the Pokémon TCG API v2 card shape so the same parser is used.
 */

export interface MockSet {
  id: string;
  name: string;
  printedTotal: number;
  ptcgoCode: string;
  releaseDate: string;
}

export const MOCK_SETS: MockSet[] = [
  { id: "demo-a", name: "Demo Set Alpha", printedTotal: 198, ptcgoCode: "DSA", releaseDate: "2026/03/01" },
  { id: "demo-b", name: "Demo Set Beta", printedTotal: 198, ptcgoCode: "DSB", releaseDate: "2025/06/01" },
  { id: "demo-c", name: "Demo Set Gamma", printedTotal: 102, ptcgoCode: "DSG", releaseDate: "2024/01/01" },
];

interface MockPriceBlock {
  /** How many days before "now" the fixture pretends it was updated. */
  ageDays: number;
  prices: Record<string, Record<string, number> | number>;
}

export interface MockCardRecord {
  id: string;
  name: string;
  number: string;
  set: string;
  rarity: string;
  tcgplayer?: MockPriceBlock;
  cardmarket?: MockPriceBlock;
}

export const MOCK_CARDS: MockCardRecord[] = [
  {
    id: "demo-a-25",
    name: "Pikachu",
    number: "25",
    set: "demo-a",
    rarity: "Common",
    tcgplayer: {
      ageDays: 1,
      prices: {
        normal: { low: 0.1, mid: 0.25, high: 0.9, market: 0.2 },
        reverseHolofoil: { low: 0.4, mid: 0.75, high: 2, market: 0.6 },
      },
    },
    cardmarket: {
      ageDays: 1,
      prices: { trendPrice: 0.18, averageSellPrice: 0.2, lowPrice: 0.05, avg30: 0.19, reverseHoloTrend: 0.55, reverseHoloSell: 0.6, reverseHoloLow: 0.3, reverseHoloAvg30: 0.52 },
    },
  },
  {
    // Same name and number as demo-a-25 in a same-size set: duplicate-artwork reprint.
    id: "demo-b-25",
    name: "Pikachu",
    number: "25",
    set: "demo-b",
    rarity: "Common",
    tcgplayer: { ageDays: 2, prices: { normal: { low: 0.05, mid: 0.15, high: 0.5, market: 0.12 } } },
  },
  {
    id: "demo-a-6",
    name: "Charizard ex",
    number: "6",
    set: "demo-a",
    rarity: "Double Rare",
    tcgplayer: { ageDays: 1, prices: { holofoil: { low: 12, mid: 15, high: 30, market: 14 } } },
    // Deliberately old, to exercise the stale-quote path.
    cardmarket: { ageDays: 40, prices: { trendPrice: 12.5, averageSellPrice: 13, lowPrice: 9.99, avg30: 12.8 } },
  },
  {
    id: "demo-c-58",
    name: "Pikachu",
    number: "58",
    set: "demo-c",
    rarity: "Common",
    // No price blocks at all: exercises "No quote available".
  },
  {
    id: "demo-c-4",
    name: "Charizard",
    number: "4",
    set: "demo-c",
    rarity: "Rare Holo",
    tcgplayer: { ageDays: 3, prices: { holofoil: { low: 200, mid: 300, high: 600, market: 280 } } },
    cardmarket: { ageDays: 3, prices: { trendPrice: 240, averageSellPrice: 255, lowPrice: 180, avg30: 250 } },
  },
  {
    id: "demo-a-TG05",
    name: "Eevee",
    number: "TG05",
    set: "demo-a",
    rarity: "Trainer Gallery Rare Holo",
    tcgplayer: { ageDays: 1, prices: { holofoil: { low: 1.5, mid: 3, high: 7, market: 2.8 } } },
  },
  {
    id: "demo-b-133",
    name: "Eevee",
    number: "133",
    set: "demo-b",
    rarity: "Common",
    tcgplayer: { ageDays: 2, prices: { normal: { low: 0.08, mid: 0.2, high: 0.6, market: 0.15 }, reverseHolofoil: { low: 0.3, mid: 0.5, high: 1.2, market: 0.45 } } },
    cardmarket: { ageDays: 2, prices: { trendPrice: 0.12, averageSellPrice: 0.15, lowPrice: 0.02, avg30: 0.14, reverseHoloTrend: 0.4, reverseHoloSell: 0.42, reverseHoloLow: 0.2, reverseHoloAvg30: 0.38 } },
  },
];
