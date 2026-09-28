"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { finishLabel, type CatalogCard } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import { CardArt } from "./CardArt";

interface Row {
  card: CatalogCard;
  ownedFinishes: string[];
  ownedCount: number;
  wishlisted: boolean;
}
interface Data {
  setId: string;
  setName: string;
  printedTotal: number | null;
  cards: Row[];
}

export function SetDetail({ setId }: { setId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [filter, setFilter] = useState<"all" | "missing" | "owned">("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<Data>(`/api/sets/${encodeURIComponent(setId)}`));
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Network error.");
    }
  }, [setId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void load();
  }, [load]);

  if (error) return <p role="alert" className="text-red-800">{error}</p>;
  if (!data) return <p aria-busy="true">Loading set…</p>;
  const owned = data.cards.filter((c) => c.ownedCount > 0).length;
  const rows = data.cards.filter((c) => (filter === "all" ? true : filter === "owned" ? c.ownedCount > 0 : c.ownedCount === 0));

  return (
    <div className="grid gap-5">
      <Link href="/sets" className="text-sm font-medium text-brand-700 underline">← All sets</Link>
      <div>
        <h1 className="text-2xl font-bold">{data.setName}</h1>
        <p className="text-slate-700">
          You own {owned} of {data.cards.length} cards ({Math.round((owned / data.cards.length) * 100)}%).
        </p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Filter cards">
        {(["all", "missing", "owned"] as const).map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm capitalize ${filter === f ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {rows.map((r) => (
          <li key={r.card.catalogId} className={`grid gap-1 rounded-lg border bg-white p-2 ${r.ownedCount ? "border-emerald-600" : "border-slate-200"}`}>
            <div className={r.ownedCount ? "" : "opacity-60"}>
              <CardArt card={r.card} />
            </div>
            <p className="text-sm font-medium">{r.card.name}</p>
            <p className="text-xs text-slate-600">#{r.card.number}{r.card.rarity ? ` · ${r.card.rarity}` : ""}</p>
            {r.ownedCount > 0 ? (
              <p className="text-xs font-medium text-emerald-800">Owned ×{r.ownedCount} ({[...new Set(r.ownedFinishes)].map(finishLabel).join(", ")})</p>
            ) : r.wishlisted ? (
              <p className="text-xs text-slate-700">On wishlist</p>
            ) : (
              <button
                className="justify-self-start text-xs font-medium text-brand-700 underline"
                onClick={async () => {
                  await api("/api/wishlist", "POST", { catalogId: r.card.catalogId, finish: r.card.finishes[0] ?? "normal" }).catch(() => undefined);
                  void load();
                }}
              >
                Add to wishlist<span className="sr-only"> {r.card.name}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
