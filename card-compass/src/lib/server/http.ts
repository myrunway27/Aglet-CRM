import { RateLimitedError, UpstreamError } from "./errors";

export interface FetchJsonOptions {
  headers?: Record<string, string>;
  timeoutMs: number;
  /** Retries for transient failures (network, 5xx, 429). */
  retries?: number;
  /** Base backoff in ms; actual delay = base * 2^attempt + jitter. */
  backoffMs?: number;
  /** Longest Retry-After we are willing to wait inside one request. */
  maxWaitMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs) && secs >= 0) return secs;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

/**
 * GET a JSON document from a fixed, server-configured URL with timeout,
 * exponential backoff with jitter, and Retry-After handling. Callers must never
 * pass user-supplied hosts (SSRF): only query strings built from validated input.
 */
export async function fetchJson(url: string, opts: FetchJsonOptions): Promise<unknown> {
  const {
    headers = {},
    timeoutMs,
    retries = 2,
    backoffMs = 300,
    maxWaitMs = 5_000,
    fetchImpl = fetch,
    sleep = defaultSleep,
    random = Math.random,
  } = opts;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { headers, signal: ctrl.signal, redirect: "error", cache: "no-store" });
      if (res.status === 429) {
        const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
        const waitMs = retryAfter !== null ? retryAfter * 1000 : backoffMs * 2 ** attempt;
        if (attempt < retries && waitMs <= maxWaitMs) {
          await sleep(waitMs + random() * backoffMs);
          continue;
        }
        throw new RateLimitedError(retryAfter ?? 60, "upstream");
      }
      if (res.status >= 500) {
        lastError = new UpstreamError(`Upstream responded ${res.status}`, res.status);
      } else if (!res.ok) {
        // 4xx other than 429 is not transient.
        throw new UpstreamError(`Upstream responded ${res.status}`, res.status);
      } else {
        return await res.json();
      }
    } catch (err) {
      if (err instanceof RateLimitedError) throw err;
      if (err instanceof UpstreamError && err.status !== undefined && err.status < 500) throw err;
      lastError =
        err instanceof Error && err.name === "AbortError" ? new UpstreamError("Upstream request timed out") : err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(backoffMs * 2 ** attempt + random() * backoffMs);
  }
  throw lastError instanceof UpstreamError ? lastError : new UpstreamError("Upstream request failed");
}
