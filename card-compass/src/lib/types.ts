// Shared, client-safe domain types.

export type SourceId = "tcgplayer" | "cardmarket";

export const SOURCE_INFO: Record<SourceId, { label: string; currency: string; region: string }> = {
  tcgplayer: { label: "TCGplayer", currency: "USD", region: "US" },
  cardmarket: { label: "Cardmarket", currency: "EUR", region: "EU" },
};

export type Finish =
  | "normal"
  | "holofoil"
  | "reverseHolofoil"
  | "1stEditionNormal"
  | "1stEditionHolofoil"
  | "unlimitedHolofoil";

export const FINISH_LABELS: Record<Finish, string> = {
  normal: "Normal (non-holo)",
  holofoil: "Holofoil",
  reverseHolofoil: "Reverse holofoil",
  "1stEditionNormal": "1st Edition normal",
  "1stEditionHolofoil": "1st Edition holofoil",
  unlimitedHolofoil: "Unlimited holofoil",
};

export const LANGUAGES = [
  "English",
  "Japanese",
  "French",
  "German",
  "Italian",
  "Spanish",
  "Portuguese",
  "Korean",
  "Chinese",
  "Other",
] as const;
export type Language = (typeof LANGUAGES)[number];

export const CONDITIONS = [
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
  "Unsure",
] as const;
export type Condition = (typeof CONDITIONS)[number];

export type Grading = "raw" | "graded";

/** One informational reference price from a named source. Never a live offer. */
export interface PriceReference {
  source: SourceId;
  /** Human label for the source, used in attribution. */
  sourceLabel: string;
  /** Validated https link to the source page, or null if none was supplied. */
  sourceUrl: string | null;
  currency: string;
  amountMinor: number;
  /** Source-specific price type, e.g. "market", "trend", "avg30". */
  subtype: string;
  subtypeLabel: string;
  finish: Finish;
  /** ISO timestamp the source reports for the price. */
  observedAt: string;
  /** True for bundled demo data. Must be rendered as such. */
  demo: boolean;
  /** Caveat to show next to the row, if any. */
  note?: string;
}

export interface CatalogCard {
  /** Provider-qualified id, e.g. "pokemontcg:sv3pt5-25". */
  catalogId: string;
  name: string;
  number: string;
  setId: string;
  setName: string;
  setPrintedTotal: number | null;
  setCode: string | null;
  setReleaseDate: string | null;
  imageUrl: string | null;
  rarity: string | null;
  /** Finishes the catalog knows about for this printing. */
  finishes: Finish[];
  prices: PriceReference[];
}

export type SourceStatus =
  | { source: SourceId; sourceLabel: string; status: "ok" }
  | { source: SourceId; sourceLabel: string; status: "none" }
  | { source: SourceId; sourceLabel: string; status: "unavailable"; message: string };

export interface Candidate {
  card: CatalogCard;
  score: number;
  reasons: string[];
}

export type MatchConfidence = "high" | "medium" | "low" | "none";
