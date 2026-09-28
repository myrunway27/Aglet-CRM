"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { finishLabel } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import { formatMinor } from "@/lib/money";
import { SOURCES, type SourceId } from "@/lib/prices";
import { CONDITIONS, LANGUAGES } from "@/lib/selection";
import type { CollectionTotals, ItemValuation } from "@/lib/valuation";
import { ValueChart, type Point } from "./ValueChart";

interface Item {
  id: string;
  catalogId: string;
  name: string;
  setName: string;
  number: string;
  finish: string;
  language: keyof typeof LANGUAGES;
  grading: string;
  condition: keyof typeof CONDITIONS | null;
  grader: string | null;
  grade: string | null;
  quantity: number;
  purchasePriceMinor: number | null;
  purchaseCurrency: string | null;
  valuation: ItemValuation;
  fromStore: boolean;
}
interface Data {
  items: Item[];
  totals: CollectionTotals[];
  converted: { currency: string; fxDate: string | null; fxSource: string | null; values: Array<{ source: SourceId; amountMinor: number | null }> };
  history: Array<Point & { source: SourceId; currency: string }>;
}

export function CollectionView({ country }: { country: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<Data>(`/api/collection?country=${country}`));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
    }
  }, [country]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  if (error)
    return (
      <div role="alert" className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-red-900">
        {error}
        <button onClick={load} className="underline">Retry</button>
      </div>
    );
  if (!data) return <p aria-busy="true" className="text-slate-700">Valuing your collection…</p>;

  const cards = data.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold">My collection</h1>
        <p className="text-slate-700">
          {cards} card{cards === 1 ? "" : "s"}. Values use reference prices per source, kept separate: they are not added
          across sources or currencies.
        </p>
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4">
          Nothing here yet. <Link href="/" className="font-medium text-brand-700 underline">Scan or search a card</Link> and
          choose &quot;Add to collection&quot;.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.totals.map((t) => {
              const conv = data.converted.values.find((v) => v.source === t.source)?.amountMinor ?? null;
              return (
                <section key={t.source} className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`tot-${t.source}`}>
                  <h2 id={`tot-${t.source}`} className="text-sm font-medium text-slate-700">
                    Value on {SOURCES[t.source].label} basis
                  </h2>
                  <p className="mt-1 font-mono text-3xl font-semibold">{formatMinor(t.amountMinor, t.currency)}</p>
                  {conv !== null && data.converted.currency !== t.currency && (
                    <p className="text-sm text-slate-700">
                      ≈ {formatMinor(conv, data.converted.currency)}{" "}
                      <span className="text-slate-600">
                        at {data.converted.fxSource === "demo" ? "demo" : "ECB"} rate of {data.converted.fxDate}
                      </span>
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-600">
                    {t.itemsPriced} of {t.itemsTotal} cards have a {SOURCES[t.source].label} reference.
                  </p>
                </section>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(["tcgplayer", "cardmarket"] as const).map((s) => {
              const pts = data.history.filter((h) => h.source === s);
              return pts.length ? (
                <ValueChart key={s} title={`${SOURCES[s].label} basis (${SOURCES[s].currency})`} currency={SOURCES[s].currency} points={pts} />
              ) : null;
            })}
          </div>
          <p className="-mt-3 text-xs text-slate-600">History records one point per day when you open this page or the daily job runs.</p>

          <section aria-labelledby="items-h" className="grid gap-2">
            <h2 id="items-h" className="text-xl font-semibold">Cards</h2>
            <ul className="grid gap-2">
              {data.items.map((it) => (
                <li key={it.id} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <Link
                      href={`/cards/${encodeURIComponent(it.catalogId)}?finish=${it.finish}&lang=${it.language}&grading=${it.grading}${it.condition ? `&condition=${it.condition}` : ""}${it.grader ? `&grader=${it.grader}&grade=${it.grade}` : ""}`}
                      className="font-semibold text-slate-900 underline decoration-slate-300"
                    >
                      {it.name}
                    </Link>
                    <p className="text-sm text-slate-700">
                      {it.setName} #{it.number} · {finishLabel(it.finish)} · {LANGUAGES[it.language]} ·{" "}
                      {it.grading === "raw" ? (it.condition ?? "") : `${it.grader} ${it.grade}`}
                    </p>
                    <p className="text-sm">
                      {it.valuation.unpricedReason ? (
                        <span className="text-slate-600">No value: {it.valuation.unpricedReason}</span>
                      ) : (
                        (Object.entries(it.valuation.bySource) as Array<[SourceId, NonNullable<ItemValuation["bySource"][SourceId]>]>).map(([s, v]) => (
                          <span key={s} className="mr-3 inline-block">
                            {SOURCES[s].label}: <span className="font-mono">{formatMinor(v.unitMinor * it.quantity, v.currency)}</span>
                            {v.stale && <span className="ml-1 text-xs text-amber-800">(stale)</span>}
                          </span>
                        ))
                      )}
                      {it.fromStore && <span className="text-xs text-amber-800"> · last stored price</span>}
                    </p>
                    {it.purchasePriceMinor !== null && it.purchaseCurrency && (
                      <p className="text-xs text-slate-600">Paid {formatMinor(it.purchasePriceMinor, it.purchaseCurrency)} each</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-sm">
                      Qty
                      <input
                        type="number"
                        min={1}
                        max={999}
                        defaultValue={it.quantity}
                        className="w-16 rounded border border-slate-300 px-2 py-1"
                        onBlur={async (e) => {
                          const q = Number(e.target.value);
                          if (q >= 1 && q <= 999 && q !== it.quantity) {
                            await api(`/api/collection/${it.id}`, "PATCH", { quantity: q });
                            void load();
                          }
                        }}
                      />
                    </label>
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-sm"
                      onClick={async () => {
                        await api(`/api/collection/${it.id}`, "DELETE");
                        void load();
                      }}
                    >
                      Remove<span className="sr-only"> {it.name}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
