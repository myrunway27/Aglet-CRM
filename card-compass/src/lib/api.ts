import "server-only";
import { NotFoundError, RateLimitedError, UpstreamError, ValidationError } from "./errors";
import { log } from "./log";

export interface ApiErrorBody {
  error: { code: "rate_limited" | "not_found" | "invalid" | "upstream_unavailable" | "internal"; message: string; retryAfterSeconds?: number };
}

export function errorResponse(err: unknown, route: string): Response {
  if (err instanceof RateLimitedError) {
    const message =
      err.scope === "client"
        ? "Too many requests. Please wait a moment and try again."
        : "The price/catalog source is rate-limiting us. Please retry shortly.";
    return Response.json(
      { error: { code: "rate_limited", message, retryAfterSeconds: err.retryAfterSeconds } } satisfies ApiErrorBody,
      { status: 429, headers: { "Retry-After": String(err.retryAfterSeconds) } },
    );
  }
  if (err instanceof NotFoundError) {
    return Response.json({ error: { code: "not_found", message: err.message } } satisfies ApiErrorBody, { status: 404 });
  }
  if (err instanceof ValidationError) {
    return Response.json({ error: { code: "invalid", message: err.message } } satisfies ApiErrorBody, { status: 400 });
  }
  if (err instanceof UpstreamError) {
    log.warn("api.upstream_unavailable", { route, status: err.status ?? null });
    return Response.json(
      { error: { code: "upstream_unavailable", message: "The source is unavailable right now. Please retry." } } satisfies ApiErrorBody,
      { status: 502 },
    );
  }
  log.error("api.internal_error", { route, name: err instanceof Error ? err.name : "unknown" });
  return Response.json({ error: { code: "internal", message: "Something went wrong." } } satisfies ApiErrorBody, { status: 500 });
}

/** Best-effort client key for inbound rate limiting only. Never logged or stored. */
export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
