import type { ReferenceView } from "./price/select";
import type { CatalogCard, Condition, Finish, Grading, Language, MatchConfidence } from "./types";

export type CardSummary = Omit<CatalogCard, "prices">;

export interface ApiError {
  error: { code: string; message: string };
}

export interface ScanResponse {
  scanId: string | null;
  imageRetained: false;
  ocr: {
    provider: "mock" | "vision";
    textFound: boolean;
    lines: string[];
    locale: string | null;
    parsed: { name: string | null; number: string | null; setCodes: string[]; languageHint: string | null };
  };
  match: {
    confidence: MatchConfidence;
    ambiguous: boolean;
    message: string;
    candidates: Array<{ card: CardSummary; score: number; reasons: string[] }>;
  };
  notice: string | null;
}

export interface SearchResponse {
  provider: "mock" | "pokemontcg";
  results: CardSummary[];
}

export interface PricesResponse {
  card: CardSummary;
  selection: { finish: Finish; language: Language; grading: Grading; condition: Condition };
  origin: "live" | "saved" | "demo";
  view: ReferenceView;
  disclaimer: string;
  attribution: string;
  liveOffers: { enabled: false; reason: string };
}
