import { RateLimitedError, UpstreamError } from "./errors";

export type FetchLike = typeof fetch;

export interface RetryOptions {
  timeoutMs: number;
  retries: number;
  baseDelayMs?: number;
  fetchImpl?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function parseRetryAfter(header: string | null, nowMs = Date.now()): number {
  if (!header) return 60;
  const secs = Number(header);
  if (Number.isFinite(secs) && secs >= 0) return Math.ceil(secs);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(1, Math.ceil((date - nowMs) / 1000));
  return 60;
}

/**
 * Fetch JSON with a per-attempt timeout and full-jitter exponential backoff for
 * transient failures (network errors, timeouts, 5xx). A 429 is never retried
 * here: it is surfaced as RateLimitedError so callers can cool down.
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  init: RequestInit,
  opts: RetryOptions,
): Promise<T> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const random = opts.random ?? Math.random;
  const base = opts.baseDelayMs ?? 300;
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    if (attempt > 0) await sleep(Math.floor(random() * base * 2 ** attempt));
    let res: Response;
    try {
      res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(opts.timeoutMs) });
    } catch (err) {
      lastError = new UpstreamError(
        err instanceof Error && err.name === "TimeoutError" ? "Upstream timeout" : "Upstream network error",
        undefined,
        true,
      );
      continue;
    }
    if (res.status === 429) {
      throw new RateLimitedError(parseRetryAfter(res.headers.get("retry-after")), "upstream");
    }
    if (res.status >= 500) {
      lastError = new UpstreamError(`Upstream error ${res.status}`, res.status, true);
      continue;
    }
    if (!res.ok) {
      throw new UpstreamError(`Upstream error ${res.status}`, res.status, false);
    }
    try {
      return (await res.json()) as T;
    } catch {
      throw new UpstreamError("Upstream returned invalid JSON", res.status, false);
    }
  }
  throw lastError instanceof Error ? lastError : new UpstreamError("Upstream failed", undefined, true);
}
