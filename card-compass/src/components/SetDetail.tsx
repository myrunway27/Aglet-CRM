"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { finishLabel, type CatalogCard } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import { CardArt } from "./CardArt";
import { ProgressRing } from "./ProgressRing";

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

  if (error) return <p role="alert" className="text-bad">{error}</p>;
  if (!data) return <p aria-busy="true">Loading set…</p>;
  const owned = data.cards.filter((c) => c.ownedCount > 0).length;
  const rows = data.cards.filter((c) => (filter === "all" ? true : filter === "owned" ? c.ownedCount > 0 : c.ownedCount === 0));

  return (
    <div className="grid gap-5">
      <Link href="/sets" className="text-sm font-medium text-link underline">← All sets</Link>
      <div className="flex items-center gap-4">
        <ProgressRing owned={owned} total={data.cards.length} size={72} />
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">{data.setName}</h1>
          <p className="text-ink-2">
            You own {owned} of {data.cards.length} cards ({Math.round((owned / data.cards.length) * 100)}%).
          </p>
        </div>
      </div>
      <div className="flex gap-2" role="group" aria-label="Filter cards">
        {(["all", "missing", "owned"] as const).map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm capitalize ${filter === f ? "border-ink bg-primary text-on-primary" : "border-line-strong bg-surface"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {rows.map((r) => (
          <li key={r.card.catalogId} className={`grid content-start gap-1.5 rounded-2xl border bg-surface p-2.5 ${r.ownedCount ? "border-good ring-1 ring-good" : "border-line"}`}>
            <div className={r.ownedCount ? "" : "opacity-45 grayscale"}>
              <CardArt card={r.card} size="fill" />
            </div>
            <p className="font-display text-sm font-bold">{r.card.name}</p>
            <p className="text-xs text-muted">#{r.card.number}{r.card.rarity ? ` · ${r.card.rarity}` : ""}</p>
            {r.ownedCount > 0 ? (
              <p className="text-xs font-medium text-good">Owned ×{r.ownedCount} ({[...new Set(r.ownedFinishes)].map(finishLabel).join(", ")})</p>
            ) : r.wishlisted ? (
              <p className="text-xs text-ink-2">On wishlist</p>
            ) : (
              <button
                className="justify-self-start text-xs font-medium text-link underline"
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
