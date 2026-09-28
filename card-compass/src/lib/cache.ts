/**
 * TTL cache that keeps expired entries for a grace period so callers can serve
 * stale data if the upstream fails (stale-if-error).
 */
export class TtlCache<V> {
  private store = new Map<string, { value: V; expiresAt: number; storedAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly staleGraceMs: number,
    private readonly maxEntries = 2_000,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): { value: V; fresh: boolean; storedAt: number } | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    const t = this.now();
    if (t > e.expiresAt + this.staleGraceMs) {
      this.store.delete(key);
      return undefined;
    }
    return { value: e.value, fresh: t <= e.expiresAt, storedAt: e.storedAt };
  }

  set(key: string, value: V): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    const t = this.now();
    this.store.set(key, { value, expiresAt: t + this.ttlMs, storedAt: t });
  }
}
