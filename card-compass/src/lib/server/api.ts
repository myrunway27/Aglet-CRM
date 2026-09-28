import "server-only";
import { NextResponse } from "next/server";
import type { CatalogCard } from "../types";
import { RateLimitedError, UpstreamError } from "./errors";
import { errInfo, log } from "./log";

export type CardSummary = Omit<CatalogCard, "prices">;

export function toSummary(card: CatalogCard): CardSummary {
  // Prices are withheld until the buyer confirms the exact printing.
  const { prices: _prices, ...rest } = card;
  void _prices;
  return rest;
}

export function jsonError(status: number, code: string, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export function handleRouteError(route: string, err: unknown) {
  if (err instanceof RateLimitedError) {
    log("warn", "rate_limited", { route, scope: err.scope, retryAfter: err.retryAfterSeconds });
    return jsonError(
      429,
      "rate_limited",
      "The card data source is busy. Please retry shortly.",
      { "Retry-After": String(err.retryAfterSeconds) },
    );
  }
  if (err instanceof UpstreamError) {
    log("warn", "upstream_error", { route, ...errInfo(err) });
    return jsonError(502, "source_unavailable", "The card data source is unavailable right now.");
  }
  log("error", "route_error", { route, ...errInfo(err) });
  return jsonError(500, "internal", "Something went wrong.");
}
