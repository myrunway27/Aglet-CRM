import fixture from "../../../fixtures/fx.json";
import type { FxProvider, FxRates } from "./types";

/** Demo rates (clearly labeled "demo" in the UI), dated today so the demo flow works. */
export class MockFxProvider implements FxProvider {
  readonly id = "mock" as const;
  constructor(private readonly now: () => number = Date.now) {}
  async getRates(): Promise<FxRates> {
    return {
      base: "EUR",
      date: new Date(this.now()).toISOString().slice(0, 10),
      rates: { ...(fixture as { rates: Record<string, number> }).rates },
      source: "demo",
      sourceUrl: null,
    };
  }
}
