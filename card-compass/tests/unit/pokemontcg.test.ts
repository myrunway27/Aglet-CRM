import { describe, expect, it, vi } from "vitest";
import { buildCluesQuery, PokemonTcgProvider, sanitizeTerm, type ApiCard } from "@/lib/catalog/pokemontcg";
import { NotFoundError, RateLimitedError, UpstreamError } from "@/lib/errors";
import { fetchJsonWithRetry, parseRetryAfter } from "@/lib/http";
import { OutboundLimiter } from "@/lib/rate-limit";

const apiCard: ApiCard = {
  id: "sv1-25",
  name: "Pikachu",
  number: "25",
  set: { id: "sv1", name: "Some Set", printedTotal: 198 },
  tcgplayer: { url: "https://prices.pokemontcg.io/tcgplayer/sv1-25", updatedAt: "2026/09/27", prices: { normal: { market: 0.2 } } },
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

function provider(fetchImpl: typeof fetch, overrides: Partial<ConstructorParameters<typeof PokemonTcgProvider>[0]> = {}) {
  return new PokemonTcgProvider({
    baseUrl: "https://api.example.test/v2",
    apiKey: "secret-key",
    timeoutMs: 1000,
    perMinute: 30,
    perDay: 1000,
    catalogTtlSeconds: 60,
    priceTtlSeconds: 60,
    fetchImpl,
    sleep: async () => {},
    ...overrides,
  });
}

describe("query building", () => {
  it("combines clues and strips query syntax from user text", () => {
    expect(buildCluesQuery({ number: "25", setTotal: 198, name: "Pikachu" })).toBe('number:25 set.printedTotal:198 name:"Pikachu*"');
    expect(sanitizeTerm('pika" OR name:*')).toBe("pika OR name");
    expect(buildCluesQuery({})).toBeNull();
  });
});

describe("PokemonTcgProvider", () => {
  it("sends the key as a header, never in the URL, and caches results", async () => {
    const f = vi.fn(async () => json({ data: apiCard }));
    const p = provider(f as unknown as typeof fetch);
    const a = await p.getCard("sv1-25");
    await p.getCard("sv1-25");
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).not.toContain("secret-key");
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("secret-key");
    expect(a.card.finishes).toEqual(["normal"]);
    expect(a.isDemo).toBe(false);
  });

  it("surfaces 429 as RateLimitedError and cools down without calling upstream again", async () => {
    const f = vi.fn(async () => json({ error: "rate" }, 429, { "Retry-After": "30" }));
    const p = provider(f as unknown as typeof fetch);
    await expect(p.getCard("sv1-25")).rejects.toMatchObject({ name: "RateLimitedError", retryAfterSeconds: 30 });
    await expect(p.getCard("sv1-25")).rejects.toBeInstanceOf(RateLimitedError);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("retries transient 5xx failures then succeeds", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({}, 503))
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(json({ data: apiCard }));
    const p = provider(f as unknown as typeof fetch);
    await expect(p.getCard("sv1-25")).resolves.toBeTruthy();
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("reports provider failure after exhausting retries", async () => {
    const f = vi.fn(async () => json({}, 500));
    const p = provider(f as unknown as typeof fetch);
    await expect(p.getCard("sv1-25")).rejects.toBeInstanceOf(UpstreamError);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("serves stale cached data when the provider fails", async () => {
    let now = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const f = vi.fn().mockResolvedValueOnce(json({ data: apiCard })).mockResolvedValue(json({}, 500));
    const p = provider(f as unknown as typeof fetch, { priceTtlSeconds: 1 });
    await p.getCard("sv1-25");
    now = 5_000; // TTL expired
    await expect(p.getCard("sv1-25")).resolves.toMatchObject({ card: { catalogId: "sv1-25" } });
    vi.restoreAllMocks();
  });

  it("maps 404 to NotFoundError and rejects malformed ids without a request", async () => {
    const f = vi.fn(async () => json({}, 404));
    const p = provider(f as unknown as typeof fetch);
    await expect(p.getCard("nope-1")).rejects.toBeInstanceOf(NotFoundError);
    await expect(p.getCard("../../etc")).rejects.toBeInstanceOf(NotFoundError);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("enforces the local per-minute limit", async () => {
    const f = vi.fn(async () => json({ data: [] }));
    const p = provider(f as unknown as typeof fetch, { perMinute: 2 });
    await p.searchText("aaa");
    await p.searchText("bbb");
    await expect(p.searchText("ccc")).rejects.toMatchObject({ scope: "local" });
  });

  it("turns a number query into structured clues", async () => {
    const f = vi.fn(async () => json({ data: [apiCard] }));
    const p = provider(f as unknown as typeof fetch);
    await p.searchText("025/198");
    const url = new URL((f.mock.calls[0] as unknown as [string])[0]);
    expect(url.searchParams.get("q")).toBe("number:25 set.printedTotal:198");
  });
});

describe("limiter + retry helpers", () => {
  it("resets per-minute and per-day windows", () => {
    let t = Date.parse("2026-09-28T23:59:00Z");
    const l = new OutboundLimiter(1, 2, () => t);
    l.acquire();
    expect(() => l.acquire()).toThrow(RateLimitedError);
    t += 60_000; // next minute, next day
    l.acquire(); // new minute and new UTC day: both windows reset
    expect(() => l.acquire()).toThrow(RateLimitedError);
  });

  it("enforces the daily cap", () => {
    let t = Date.parse("2026-09-28T10:00:00Z");
    const l = new OutboundLimiter(100, 2, () => t);
    l.acquire();
    t += 60_000;
    l.acquire();
    t += 60_000;
    expect(() => l.acquire()).toThrow(/Rate limited \(local\)/);
  });

  it("parses Retry-After seconds and dates", () => {
    expect(parseRetryAfter("12")).toBe(12);
    expect(parseRetryAfter(null)).toBe(60);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 0)).toBe(10);
  });

  it("times out slow requests and reports them as upstream failures", async () => {
    const slow = (_: unknown, init?: RequestInit) =>
      new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("t"), { name: "TimeoutError" }))),
      );
    await expect(
      fetchJsonWithRetry("https://x.test", {}, { timeoutMs: 20, retries: 0, fetchImpl: slow as typeof fetch }),
    ).rejects.toThrow("Upstream timeout");
  });
});
