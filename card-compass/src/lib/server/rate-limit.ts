import { RateLimitedError } from "./errors";

/**
 * In-process request budget (sliding minute + fixed UTC day). This protects the
 * upstream quota from a single instance; multi-instance deployments need a
 * shared store (e.g. Postgres/Redis) — see README "Known limitations".
 */
export class RequestBudget {
  private minuteHits: number[] = [];
  private day = "";
  private dayCount = 0;

  constructor(
    private readonly perMinute: number,
    private readonly perDay: number,
    private readonly now: () => number = Date.now,
  ) {}

  take(): void {
    const t = this.now();
    const today = new Date(t).toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.dayCount = 0;
    }
    this.minuteHits = this.minuteHits.filter((h) => t - h < 60_000);
    if (this.dayCount >= this.perDay) {
      const midnight = Date.parse(`${today}T00:00:00Z`) + 86_400_000;
      throw new RateLimitedError(Math.ceil((midnight - t) / 1000), "local");
    }
    if (this.minuteHits.length >= this.perMinute) {
      const oldest = this.minuteHits[0] ?? t;
      throw new RateLimitedError(Math.max(1, Math.ceil((oldest + 60_000 - t) / 1000)), "local");
    }
    this.minuteHits.push(t);
    this.dayCount += 1;
  }
}
