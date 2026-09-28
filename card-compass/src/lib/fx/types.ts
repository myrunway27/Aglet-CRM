export interface FxRates {
  /** Rates are "1 EUR = rate × currency" (ECB convention). */
  base: "EUR";
  /** Reference date published by the source (YYYY-MM-DD). */
  date: string;
  rates: Record<string, number>;
  source: "ECB" | "demo";
  sourceUrl: string | null;
}

export interface FxProvider {
  readonly id: "ecb" | "mock";
  getRates(): Promise<FxRates>;
}
