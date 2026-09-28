/* eslint-disable @typescript-eslint/no-explicit-any -- test assertions on thrown errors */
import { describe, expect, it, vi } from "vitest";
import { RateLimitedError, UpstreamError } from "@/lib/server/errors";
import { fetchJson } from "@/lib/server/http";
import { RequestBudget } from "@/lib/server/rate-limit";
import { TtlCache } from "@/lib/server/ttl-cache";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const base = { timeoutMs: 1000, sleep: vi.fn(async () => {}), random: () => 0 };

describe("fetchJson", () => {
  it("returns parsed JSON", async () => {
    const f = vi.fn(async () => json({ ok: 1 }));
    await expect(fetchJson("https://x.test", { ...base, fetchImpl: f })).resolves.toEqual({ ok: 1 });
  });

  it("retries 5xx with backoff then succeeds", async () => {
    const f = vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json({ ok: 2 }));
    const sleep = vi.fn(async () => {});
    await expect(fetchJson("https://x.test", { ...base, sleep, fetchImpl: f })).resolves.toEqual({ ok: 2 });
    expect(f).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(300);
  });

  it("honours Retry-After on 429 and then succeeds", async () => {
    const f = vi.fn().mockResolvedValueOnce(json({}, 429, { "retry-after": "2" })).mockResolvedValueOnce(json({ ok: 3 }));
    const sleep = vi.fn(async () => {});
    await expect(fetchJson("https://x.test", { ...base, sleep, fetchImpl: f })).resolves.toEqual({ ok: 3 });
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("gives up with RateLimitedError when Retry-After is too long", async () => {
    const f = vi.fn(async () => json({}, 429, { "retry-after": "120" }));
    const err: any = await fetchJson("https://x.test", { ...base, fetchImpl: f }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RateLimitedError);
    expect(err.retryAfterSeconds).toBe(120);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("does not retry non-429 4xx", async () => {
    const f = vi.fn(async () => json({}, 404));
    const err: any = await fetchJson("https://x.test", { ...base, fetchImpl: f }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.status).toBe(404);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("provider failure: persistent 5xx / network errors become UpstreamError", async () => {
    const f = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(fetchJson("https://x.test", { ...base, retries: 2, fetchImpl: f })).rejects.toBeInstanceOf(UpstreamError);
    expect(f).toHaveBeenCalledTimes(3);
  });

  it("times out slow responses", async () => {
    const f = vi.fn(
      (_: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" })));
        }),
    );
    const err: any = await fetchJson("https://x.test", { ...base, timeoutMs: 10, retries: 0, fetchImpl: f as typeof fetch }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UpstreamError);
    expect(err.message).toMatch(/timed out/);
  });

  it("refuses to follow redirects", async () => {
    const f = vi.fn(async () => json({}));
    await fetchJson("https://x.test", { ...base, fetchImpl: f });
    expect(f.mock.calls[0]).toBeDefined();
    expect((f.mock.calls[0] as unknown as [string, RequestInit])[1].redirect).toBe("error");
  });
});

describe("RequestBudget", () => {
  it("enforces the per-minute limit and recovers after the window", () => {
    let t = Date.parse("2026-09-28T00:00:00Z");
    const b = new RequestBudget(2, 100, () => t);
    b.take();
    b.take();
    expect(() => b.take()).toThrow(RateLimitedError);
    t += 60_001;
    expect(() => b.take()).not.toThrow();
  });

  it("enforces the daily limit and resets at UTC midnight", () => {
    let t = Date.parse("2026-09-28T23:00:00Z");
    const b = new RequestBudget(100, 1, () => t);
    b.take();
    const err = (() => {
      try {
        b.take();
      } catch (e) {
        return e as RateLimitedError;
      }
    })();
    expect(err?.retryAfterSeconds).toBe(3600);
    t = Date.parse("2026-09-29T00:00:01Z");
    expect(() => b.take()).not.toThrow();
  });
});

describe("TtlCache", () => {
  it("expires entries and caps size", () => {
    let t = 0;
    const c = new TtlCache<number>(100, 2, () => t);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.get("a")).toBeUndefined();
    expect(c.get("c")).toBe(3);
    t = 101;
    expect(c.get("c")).toBeUndefined();
  });
});
