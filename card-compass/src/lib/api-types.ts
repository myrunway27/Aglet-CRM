import type { CatalogCard } from "./catalog/types";
import type { MatchResult } from "./matching/match";
import type { ParsedCardText } from "./matching/parse";
import type { PriceReference, SourceStatus } from "./prices";

export type Mode = "mock" | "live";

export interface ScanResponse {
  scanId: string | null;
  mode: Mode;
  ocr: { provider: "mock" | "google"; text: string; warnings: string[] };
  parsed: ParsedCardText;
  match: MatchResult;
}

export interface SearchResponse {
  mode: Mode;
  results: CatalogCard[];
}

export interface PricesResponse {
  mode: Mode;
  servedFrom: "source" | "stored";
  card: CatalogCard;
  references: PriceReference[];
  sources: SourceStatus[];
  notices: string[];
  fetchedAt: string;
}

export interface ApiError {
  error: { code: string; message: string; retryAfterSeconds?: number };
}

export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

export async function readJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok || !body) {
    const err = (body as ApiError | null)?.error;
    throw new ClientApiError(err?.message ?? `Request failed (${res.status})`, res.status, err?.retryAfterSeconds);
  }
  return body as T;
}
