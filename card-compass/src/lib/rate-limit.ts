import { RateLimitedError } from "./errors";

/**
 * Fixed-window limiter for outbound calls (per minute + per UTC day) with an
 * explicit cooldown set after an upstream 429. In-memory: per server instance.
 */
export class OutboundLimiter {
  private minuteKey = -1;
  private minuteCount = 0;
  private dayKey = "";
  private dayCount = 0;
  private cooldownUntil = 0;

  constructor(
    private readonly perMinute: number,
    private readonly perDay: number,
    private readonly now: () => number = Date.now,
  ) {}

  acquire(): void {
    const t = this.now();
    if (t < this.cooldownUntil) {
      throw new RateLimitedError(Math.ceil((this.cooldownUntil - t) / 1000), "upstream");
    }
    const minute = Math.floor(t / 60_000);
    if (minute !== this.minuteKey) {
      this.minuteKey = minute;
      this.minuteCount = 0;
    }
    const day = new Date(t).toISOString().slice(0, 10);
    if (day !== this.dayKey) {
      this.dayKey = day;
      this.dayCount = 0;
    }
    if (this.dayCount >= this.perDay) {
      const nextDay = Date.parse(`${day}T00:00:00Z`) + 86_400_000;
      throw new RateLimitedError(Math.ceil((nextDay - t) / 1000), "local");
    }
    if (this.minuteCount >= this.perMinute) {
      throw new RateLimitedError(Math.ceil(((minute + 1) * 60_000 - t) / 1000), "local");
    }
    this.minuteCount++;
    this.dayCount++;
  }

  /** Back off after the upstream reports 429. */
  cooldown(seconds: number): void {
    this.cooldownUntil = Math.max(this.cooldownUntil, this.now() + seconds * 1000);
  }
}

/** Per-key (e.g. client IP) fixed-window limiter for inbound requests. */
export class KeyedLimiter {
  private windows = new Map<string, { window: number; count: number }>();

  constructor(
    private readonly perMinute: number,
    private readonly now: () => number = Date.now,
  ) {}

  check(key: string): void {
    const t = this.now();
    const window = Math.floor(t / 60_000);
    const cur = this.windows.get(key);
    if (!cur || cur.window !== window) {
      if (this.windows.size > 10_000) this.windows.clear();
      this.windows.set(key, { window, count: 1 });
      return;
    }
    if (cur.count >= this.perMinute) {
      throw new RateLimitedError(Math.ceil(((window + 1) * 60_000 - t) / 1000), "client");
    }
    cur.count++;
  }
}
