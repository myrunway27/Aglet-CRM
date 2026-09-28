"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { finishLabel } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import { formatMinor } from "@/lib/money";
import { SOURCES, type SourceId } from "@/lib/prices";
import type { ItemValuation } from "@/lib/valuation";

interface Item {
  id: string;
  catalogId: string;
  setId: string;
  name: string;
  setName: string;
  number: string;
  finish: string;
  targetMinor: number | null;
  targetCurrency: string | null;
  alertId: string | null;
  owned: boolean;
  valuation: ItemValuation;
}

export function WishlistView() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await api<{ items: Item[] }>("/api/wishlist")).items);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  if (error) return <p role="alert" className="text-red-800">{error}</p>;
  if (!items) return <p aria-busy="true">Loading wishlist…</p>;

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">Wishlist</h1>
        <p className="text-slate-700">
          Cards you want. Give one a target price and you&apos;ll get an alert when its reference price drops below it. Open a
          card to see verified listings delivered to you.
        </p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4">
          Your wishlist is empty. Add cards from a card&apos;s price page or from <Link href="/sets" className="font-medium text-brand-700 underline">set completion</Link>.
        </p>
      ) : (
        <ul className="grid gap-2">
          {items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <div className="min-w-0">
                <Link
                  href={`/cards/${encodeURIComponent(it.catalogId)}?finish=${it.finish}&lang=en&grading=raw&condition=NM`}
                  className="font-semibold underline decoration-slate-300"
                >
                  {it.name}
                </Link>
                {it.owned && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-900">In collection</span>}
                <p className="text-sm text-slate-700">{it.setName} #{it.number} · {finishLabel(it.finish)}</p>
                <p className="text-sm">
                  {(Object.entries(it.valuation.bySource) as Array<[SourceId, NonNullable<ItemValuation["bySource"][SourceId]>]>).map(([s, v]) => (
                    <span key={s} className="mr-3 inline-block">
                      {SOURCES[s].label}: <span className="font-mono">{formatMinor(v.unitMinor, v.currency)}</span>
                    </span>
                  ))}
                  {it.valuation.unpricedReason && <span className="text-slate-600">No reference price</span>}
                </p>
                <p className="text-xs text-slate-600">
                  {it.targetMinor !== null && it.targetCurrency
                    ? `Target: below ${formatMinor(it.targetMinor, it.targetCurrency)} (alert on)`
                    : "No target price"}
                </p>
              </div>
              <button
                onClick={async () => {
                  await api(`/api/wishlist/${it.id}`, "DELETE");
                  void load();
                }}
                className="rounded border border-slate-300 px-2 py-1 text-sm"
              >
                Remove<span className="sr-only"> {it.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
