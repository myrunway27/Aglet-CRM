"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ApiError, PricesResponse } from "@/lib/api-types";
import { formatAsOf, formatMoney } from "@/lib/price/format";
import type { SourceBlock } from "@/lib/price/select";
import { COUNTRIES, useCountry } from "@/lib/prefs";
import { FINISH_LABELS } from "@/lib/types";
import { CardThumb } from "./CardThumb";

type State =
  | { kind: "loading" }
  | { kind: "error"; status: number; message: string; retryAfter: string | null }
  | { kind: "ok"; data: PricesResponse };

export function PriceResults({
  catalogId,
  selection,
}: {
  catalogId: string;
  selection: Record<"finish" | "language" | "grading" | "condition", string>;
}) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [country] = useCountry();
  const pref = COUNTRIES.find((c) => c.code === country) ?? COUNTRIES[0];
  const qs = new URLSearchParams(Object.entries(selection).filter(([, v]) => v)).toString();

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/cards/${encodeURIComponent(catalogId)}/prices?${qs}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as ApiError | null;
        setState({
          kind: "error",
          status: res.status,
          message: body?.error.message ?? `Request failed (${res.status}).`,
          retryAfter: res.headers.get("retry-after"),
        });
        return;
      }
      setState({ kind: "ok", data: (await res.json()) as PricesResponse });
    } catch {
      setState({ kind: "error", status: 0, message: "Network error. Check your connection.", retryAfter: null });
    }
  }, [catalogId, qs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; state updates happen after await
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div role="status" aria-live="polite" className="space-y-4">
        <span className="sr-only">Loading price references…</span>
        <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-56 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-red-300 bg-red-50 p-5 text-red-900">
        <h1 className="text-lg font-semibold">
          {state.status === 429 ? "Too many requests" : state.status === 404 ? "Card not found" : "Couldn’t load references"}
        </h1>
        <p>
          {state.message}
          {state.status === 429 && state.retryAfter ? ` Try again in about ${state.retryAfter} s.` : ""}
        </p>
        <div className="flex gap-3">
          {state.status !== 404 && state.status !== 400 && (
            <button onClick={() => void load()} className="rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800">
              Retry
            </button>
          )}
          <Link href="/" className="rounded-md border border-red-700 px-3 py-1.5 text-sm font-medium">
            Back to scan
          </Link>
        </div>
      </div>
    );
  }

  const { card, view, selection: sel, origin } = state.data;
  return (
    <div className="space-y-6">
      {origin === "demo" && (
        <p className="rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 p-3 text-sm font-medium text-amber-900" data-testid="demo-banner">
          Demo mode: fictional sets and invented fixture prices for testing. This is not market data.
        </p>
      )}
      {origin === "saved" && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Live source unavailable. Showing the last references this app saved.
        </p>
      )}

      <section aria-labelledby="card-h" className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row">
        <CardThumb name={card.name} setName={card.setName} number={card.number} imageUrl={card.imageUrl} />
        <div className="flex-1 space-y-2">
          <h1 id="card-h" className="text-2xl font-bold">
            {card.name}
          </h1>
          <p className="text-slate-700">
            {card.setName}
            {card.setCode ? ` (${card.setCode})` : ""} · No. {card.number}
            {card.setPrintedTotal ? `/${card.setPrintedTotal}` : ""}
            {card.rarity ? ` · ${card.rarity}` : ""}
          </p>
          <ul className="flex flex-wrap gap-2 text-xs" aria-label="Your selection">
            {[FINISH_LABELS[sel.finish], sel.language, sel.grading === "raw" ? "Raw" : "Graded", sel.condition].map((t) => (
              <li key={t} className="rounded-full bg-brand-50 px-2.5 py-1 font-medium text-brand-800">
                {t}
              </li>
            ))}
          </ul>
          <Link href="/" className="inline-block text-sm text-brand-700 underline underline-offset-2">
            Scan or search another card
          </Link>
        </div>
      </section>

      <section aria-labelledby="refs-h" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="refs-h" className="text-xl font-semibold">
            Market references
          </h2>
          <p className="text-xs text-slate-600">
            Your preference: {pref.name} ({pref.currency}). Shown in original currencies, not converted.
          </p>
        </div>

        {view.notices.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
            {view.notices.map((n) => (
              <li key={n}>ⓘ {n}</li>
            ))}
          </ul>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {view.blocks.map((b) => (
            <SourceCard key={b.source} block={b} />
          ))}
        </div>

        {view.otherFinishes.length > 0 && (
          <p className="text-sm text-slate-700">
            References also exist for:{" "}
            {view.otherFinishes.map((f, i) => {
              const p = new URLSearchParams({ ...sel, finish: f });
              return (
                <span key={f}>
                  {i > 0 && ", "}
                  <Link className="text-brand-700 underline underline-offset-2" href={`/cards/${encodeURIComponent(card.catalogId)}?${p}`}>
                    {FINISH_LABELS[f]}
                  </Link>
                </span>
              );
            })}
            . Only switch if that is really your card’s finish.
          </p>
        )}

        <p className="text-xs text-slate-600">{state.data.disclaimer}</p>
        {origin !== "demo" && <p className="text-xs text-slate-600">{state.data.attribution}</p>}
      </section>

      <section aria-labelledby="offers-h" className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-600" data-testid="live-offers">
        <h2 id="offers-h" className="flex items-center gap-2 text-lg font-semibold text-slate-700">
          Live offers <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium uppercase">Not connected</span>
        </h2>
        <p className="mt-1 text-sm">
          {state.data.liveOffers.reason} We don’t show listings, delivered totals or a “cheapest” price until a licensed
          feed with shipping, tax and FX inputs is in place.
        </p>
      </section>
    </div>
  );
}

function SourceCard({ block }: { block: SourceBlock }) {
  const hId = `src-${block.source}`;
  const link = block.rows.find((r) => r.sourceUrl)?.sourceUrl ?? null;
  const dates = [...new Set(block.rows.map((r) => r.observedAt))];
  const stale = block.rows.some((r) => r.stale);
  const demo = block.rows.some((r) => r.demo);
  return (
    <article aria-labelledby={hId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid={`source-${block.source}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 id={hId} className="font-semibold">
          {block.sourceLabel}
          {demo && <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-amber-900">DEMO DATA</span>}
        </h3>
        <span className="text-xs text-slate-600">
          {block.region} reference · {block.currency}
        </span>
      </header>

      {block.status !== "ok" ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="font-medium">{block.status === "unavailable" ? "Source unavailable" : "No quote available"}</p>
          {block.reason && <p className="mt-1 text-sm text-slate-600">{block.reason}</p>}
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-slate-600">
            As of {dates.map((d) => formatAsOf(d)).join(", ")}
            {stale && <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-900">Stale</span>}
          </p>
          <table className="mt-2 w-full text-sm">
            <caption className="sr-only">
              {block.sourceLabel} reference prices in {block.currency}
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Price type</th>
                <th scope="col">Price</th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map((r) => (
                <tr key={`${r.subtype}-${r.finish}`} className="border-t border-slate-100">
                  <th scope="row" className="py-1.5 text-left font-normal">
                    {r.subtypeLabel}
                  </th>
                  <td className="py-1.5 text-right font-semibold whitespace-nowrap tabular-nums">{formatMoney(r.amountMinor, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {block.rows[0]?.note && <p className="mt-2 text-xs text-slate-600">{block.rows[0].note}</p>}
          <p className="mt-3 text-xs text-slate-600">
            Source: {block.sourceLabel}
            {link ? (
              <>
                {" · "}
                <a href={link} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline underline-offset-2">
                  View on {block.sourceLabel}
                  <span className="sr-only"> (opens in a new tab)</span> ↗
                </a>
              </>
            ) : demo ? (
              " · demo fixture, no source page"
            ) : (
              " · no source link supplied"
            )}
          </p>
        </>
      )}
    </article>
  );
}
