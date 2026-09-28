"use client";

import { useCallback, useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { formatMinor } from "@/lib/money";
import type { EvaluatedOffer, OffersResult } from "@/lib/offers/service";
import { REGIONS, type Region } from "@/lib/regions";
import { selectionToQuery, type Selection } from "@/lib/selection";

type State = { kind: "loading" } | { kind: "ok"; data: OffersResult } | { kind: "disabled" } | { kind: "error"; message: string; retryAfter?: number };

const countryName = (c: string | null) => (c && c in REGIONS ? REGIONS[c as Region].label : (c ?? "unknown"));

function OfferRow({ o, best }: { o: EvaluatedOffer; best?: boolean }) {
  const l = o.listing;
  return (
    <li className={`grid gap-2 rounded-lg border bg-white p-3 ${best ? "border-emerald-600 ring-1 ring-emerald-600" : "border-slate-200"}`}>
      {best && (
        <span className="justify-self-start rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
          Lowest estimated delivered cost among verified listings
        </span>
      )}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{l.title}</p>
          <p className="text-xs text-slate-600">
            Ships from {countryName(l.itemCountry)} · Seller {l.sellerName ?? "unknown"}
            {l.sellerFeedbackPct !== null && ` (${l.sellerFeedbackPct}% of ${l.sellerFeedbackScore})`} · Asking price
            {l.isDemo && " · Demo listing"}
          </p>
        </div>
        <div className="text-right">
          {o.landed.totalMinor !== null ? (
            <p className="font-mono text-lg font-semibold">{formatMinor(o.landed.totalMinor, o.landed.buyerCurrency)}</p>
          ) : (
            <p className="font-semibold text-slate-800">Total unknown</p>
          )}
          <p className="text-xs text-slate-600">
            {formatMinor(l.itemMinor, l.itemCurrency)} +{" "}
            {l.shippingMinor !== null ? `${formatMinor(l.shippingMinor, l.shippingCurrency)} shipping` : "shipping not quoted"}
          </p>
        </div>
      </div>
      {o.landed.lines.length > 0 && (
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 text-xs text-slate-700 sm:max-w-sm">
          {o.landed.lines.map((line) => (
            <div key={line.label} className="contents">
              <dt>{line.label}</dt>
              <dd className="text-right font-mono">{formatMinor(line.amountMinor, line.currency)}</dd>
            </div>
          ))}
        </dl>
      )}
      {o.landed.missing.length > 0 && <p className="text-xs text-amber-900">Missing: {o.landed.missing.join("; ")}</p>}
      {o.verification.reasons.length > 0 && <p className="text-xs text-slate-600">Checks: {o.verification.reasons.join("; ")}</p>}
      {o.landed.caveats.length > 0 && <p className="text-xs text-slate-600">{o.landed.caveats.join(" ")}</p>}
      {l.url ? (
        <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="justify-self-start text-sm font-medium text-brand-700 underline">
          View on eBay<span className="sr-only"> (opens in a new tab)</span> ↗
        </a>
      ) : (
        l.isDemo && <span className="text-xs text-slate-500">Demo listing, no link</span>
      )}
    </li>
  );
}

export function OffersSection({ cardId, selection, region }: { cardId: string; selection: Selection; region: Region }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(cardId)}/offers?country=${region}&${selectionToQuery(selection)}`);
      if (res.status === 503) return setState({ kind: "disabled" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new ClientApiError(body?.error?.message ?? "Listings unavailable.", res.status, body?.error?.retryAfterSeconds);
      setState({ kind: "ok", data: body as OffersResult });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof ClientApiError ? err.message : "Network error.",
        retryAfter: err instanceof ClientApiError ? err.retryAfterSeconds : undefined,
      });
    }
  }, [cardId, selection, region]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when inputs change
    void load();
  }, [load]);

  return (
    <section aria-labelledby="offers-h" className="grid gap-3" data-testid="offers">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="offers-h" className="text-xl font-semibold">Listings delivered to {REGIONS[region].label}</h2>
          {state.kind === "ok" && state.data.isDemo && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Demo listings</span>
          )}
        </div>
        <p className="text-sm text-slate-700">
          Active eBay fixed-price listings (asking prices, not completed sales). A listing is ranked only if its title matches
          your exact card and its delivered cost is fully known. Change your country above to recalculate.
        </p>
      </div>

      {state.kind === "loading" && <div aria-busy="true" className="h-32 animate-pulse rounded-xl bg-slate-200" />}
      {state.kind === "disabled" && (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
          Live listings aren&apos;t enabled on this server (needs eBay API credentials).
        </p>
      )}
      {state.kind === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {state.message}
          {state.retryAfter ? ` Try again in about ${state.retryAfter}s.` : ""}
          <button onClick={load} className="rounded border border-red-800 px-2 py-1 font-medium">Retry</button>
        </div>
      )}
      {state.kind === "ok" && (
        <>
          {state.data.ranked.length === 0 ? (
            <p className="rounded-md bg-slate-100 px-3 py-2 text-sm">
              No verified listing with a fully known delivered cost to {REGIONS[region].label} right now.
            </p>
          ) : (
            <ol className="grid gap-2" aria-label="Verified listings, lowest delivered cost first">
              {state.data.ranked.map((o, i) => (
                <OfferRow key={o.listing.listingId} o={o} best={i === 0} />
              ))}
            </ol>
          )}
          {state.data.totalUnknown.length > 0 && (
            <details className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">Matches with total unknown ({state.data.totalUnknown.length}), not ranked</summary>
              <ul className="mt-2 grid gap-2">{state.data.totalUnknown.map((o) => <OfferRow key={o.listing.listingId} o={o} />)}</ul>
            </details>
          )}
          {state.data.unverified.length > 0 && (
            <details className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">Couldn&apos;t verify ({state.data.unverified.length}), not ranked</summary>
              <ul className="mt-2 grid gap-2">{state.data.unverified.map((o) => <OfferRow key={o.listing.listingId} o={o} />)}</ul>
            </details>
          )}
          {state.data.excluded.length > 0 && (
            <details className="rounded-md border border-slate-200 bg-white px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">Not your card ({state.data.excluded.length}), excluded</summary>
              <ul className="mt-2 grid gap-2">{state.data.excluded.map((o) => <OfferRow key={o.listing.listingId} o={o} />)}</ul>
            </details>
          )}
          <p className="text-xs text-slate-600">
            Prices converted to {REGIONS[region].currency} with {state.data.fx.source === "demo" ? "demo" : "ECB reference"} rates of{" "}
            {state.data.fx.date}. Import estimates cover low-value parcels to the EU, UK and Australia only; other cases show
            &quot;total unknown&quot;.
          </p>
        </>
      )}
    </section>
  );
}
