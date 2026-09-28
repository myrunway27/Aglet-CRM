"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { finishLabel } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import { formatMinor } from "@/lib/money";
import type { Pnl, PnlTotal } from "@/lib/pnl";
import { SOURCES, type SourceId } from "@/lib/prices";
import { CONDITIONS, LANGUAGES } from "@/lib/selection";
import type { CollectionTotals, ItemValuation } from "@/lib/valuation";
import { ImportPanel } from "./ImportPanel";
import { Gain } from "./Money";
import { ValueChart, type Point } from "./ValueChart";

interface Item {
  id: string;
  catalogId: string;
  setId: string;
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
  binderId: string | null;
  valuation: ItemValuation;
  fromStore: boolean;
  pnl: Record<SourceId, Pnl | null>;
}
interface Data {
  binder: string;
  binders: Array<{ id: string; name: string }>;
  items: Item[];
  totals: CollectionTotals[];
  pnl: PnlTotal[];
  converted: { currency: string; fxDate: string | null; fxSource: string | null; values: Array<{ source: SourceId; amountMinor: number | null }> };
  history: Array<Point & { source: SourceId; currency: string }>;
}

const itemHref = (it: Item) =>
  `/cards/${encodeURIComponent(it.catalogId)}?finish=${it.finish}&lang=${it.language}&grading=${it.grading}${it.condition ? `&condition=${it.condition}` : ""}${it.grader ? `&grader=${it.grader}&grade=${it.grade}` : ""}`;

export function CollectionView({ country }: { country: string }) {
  const [binder, setBinder] = useState("all");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [newBinder, setNewBinder] = useState("");
  const [binderMsg, setBinderMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api<Data>(`/api/collection?country=${country}&binder=${encodeURIComponent(binder)}`));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
    }
  }, [country, binder]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount / binder change
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
  const current = data.binders.find((b) => b.id === binder);
  const tab = (id: string, label: string) => (
    <button
      key={id}
      aria-pressed={binder === id}
      onClick={() => setBinder(id)}
      className={`rounded-full border px-3 py-1 text-sm ${binder === id ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-800"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My collection</h1>
          <p className="text-slate-700">
            {cards} card{cards === 1 ? "" : "s"}
            {current ? ` in ${current.name}` : binder === "none" ? " not in a binder" : ""}. Values use reference prices per
            source and are never added across sources or currencies.
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <a href="/api/collection/export" download className="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium">
            Export CSV
          </a>
          <button onClick={() => setShowImport(!showImport)} aria-expanded={showImport} className="rounded-md border border-slate-300 bg-white px-3 py-2 font-medium">
            Import CSV
          </button>
        </div>
      </div>

      {showImport && <ImportPanel onDone={load} />}

      <section aria-label="Binders" className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {tab("all", "All cards")}
          {data.binders.map((b) => tab(b.id, b.name))}
          {data.binders.length > 0 && tab("none", "No binder")}
          <form
            className="flex gap-1"
            onSubmit={async (e) => {
              e.preventDefault();
              setBinderMsg(null);
              try {
                const r = await api<{ id: string }>("/api/binders", "POST", { name: newBinder });
                setNewBinder("");
                setBinder(r.id);
              } catch (err) {
                setBinderMsg(err instanceof ClientApiError ? err.message : "Network error.");
              }
            }}
          >
            <label htmlFor="new-binder" className="sr-only">New binder name</label>
            <input
              id="new-binder"
              value={newBinder}
              onChange={(e) => setNewBinder(e.target.value)}
              placeholder="New binder"
              maxLength={60}
              className="w-32 rounded-full border border-slate-300 px-3 py-1 text-sm"
            />
            <button className="rounded-full border border-brand-700 px-3 py-1 text-sm font-medium text-brand-700">Add</button>
          </form>
        </div>
        {current && (
          <div className="flex gap-3 text-sm">
            <button
              className="underline"
              onClick={async () => {
                const name = prompt("Rename binder", current.name);
                if (!name) return;
                try {
                  await api(`/api/binders/${current.id}`, "PATCH", { name });
                  void load();
                } catch (err) {
                  setBinderMsg(err instanceof ClientApiError ? err.message : "Network error.");
                }
              }}
            >
              Rename binder
            </button>
            <button
              className="text-red-800 underline"
              onClick={async () => {
                if (!confirm(`Delete "${current.name}"? Its cards stay in your collection.`)) return;
                await api(`/api/binders/${current.id}`, "DELETE");
                setBinder("all");
              }}
            >
              Delete binder
            </button>
          </div>
        )}
        {binderMsg && <p role="alert" className="text-sm text-red-800">{binderMsg}</p>}
      </section>

      {data.items.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4">
          {binder === "all" ? (
            <>
              Nothing here yet. <Link href="/" className="font-medium text-brand-700 underline">Scan or search a card</Link>,
              try <Link href="/scan/bulk" className="font-medium text-brand-700 underline">bulk scan</Link>, or import a CSV.
            </>
          ) : (
            "No cards in this binder yet. Move cards here from All cards."
          )}
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.totals.map((t) => {
              const conv = data.converted.values.find((v) => v.source === t.source)?.amountMinor ?? null;
              const p = data.pnl.find((x) => x.source === t.source);
              return (
                <section key={t.source} className="grid gap-1 rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`tot-${t.source}`}>
                  <h2 id={`tot-${t.source}`} className="text-sm font-medium text-slate-700">Value on {SOURCES[t.source].label} basis</h2>
                  <p className="font-mono text-3xl font-semibold">{formatMinor(t.amountMinor, t.currency)}</p>
                  {conv !== null && data.converted.currency !== t.currency && (
                    <p className="text-sm text-slate-700">
                      ≈ {formatMinor(conv, data.converted.currency)}{" "}
                      <span className="text-slate-600">at {data.converted.fxSource === "demo" ? "demo" : "ECB"} rate of {data.converted.fxDate}</span>
                    </p>
                  )}
                  <p className="text-xs text-slate-600">{t.itemsPriced} of {t.itemsTotal} cards have a {SOURCES[t.source].label} reference.</p>
                  {p && p.itemsCounted > 0 ? (
                    <p className="mt-1 border-t border-slate-100 pt-2 text-sm">
                      Profit/loss: <Gain minor={p.gainMinor} currency={p.currency} pct={p.gainPct} />{" "}
                      <span className="text-xs text-slate-600">
                        paid {formatMinor(p.costMinor, p.currency)} for {p.itemsCounted} card{p.itemsCounted === 1 ? "" : "s"} with a purchase price
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 border-t border-slate-100 pt-2 text-xs text-slate-600">Add purchase prices to see profit/loss.</p>
                  )}
                </section>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {(["tcgplayer", "cardmarket"] as const).map((s) => {
              const pts = data.history.filter((h) => h.source === s);
              return pts.length ? (
                <ValueChart key={s} title={`Whole collection, ${SOURCES[s].label} basis (${SOURCES[s].currency})`} currency={SOURCES[s].currency} points={pts} />
              ) : null;
            })}
          </div>

          <section aria-labelledby="items-h" className="grid gap-2">
            <h2 id="items-h" className="text-xl font-semibold">Cards</h2>
            <ul className="grid gap-2">
              {data.items.map((it) => (
                <li key={it.id} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <Link href={itemHref(it)} className="font-semibold text-slate-900 underline decoration-slate-300">{it.name}</Link>
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
                      <p className="text-xs text-slate-700">
                        Paid {formatMinor(it.purchasePriceMinor, it.purchaseCurrency)} each
                        {it.pnl.tcgplayer && (
                          <> · vs TCGplayer <Gain minor={it.pnl.tcgplayer.gainMinor} currency={it.pnl.tcgplayer.currency} pct={it.pnl.tcgplayer.gainPct} /></>
                        )}
                        {it.pnl.cardmarket && (
                          <> · vs Cardmarket <Gain minor={it.pnl.cardmarket.gainMinor} currency={it.pnl.cardmarket.currency} pct={it.pnl.cardmarket.gainPct} /></>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {data.binders.length > 0 && (
                      <label className="flex items-center gap-1 text-sm">
                        <span className="sr-only">Binder for {it.name}</span>
                        <select
                          value={it.binderId ?? ""}
                          onChange={async (e) => {
                            await api(`/api/collection/${it.id}`, "PATCH", { binderId: e.target.value || null });
                            void load();
                          }}
                          className="rounded border border-slate-300 bg-white px-2 py-1"
                        >
                          <option value="">No binder</option>
                          {data.binders.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </label>
                    )}
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
