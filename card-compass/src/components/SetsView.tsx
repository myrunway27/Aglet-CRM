"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { api } from "@/lib/client-api";

interface SetRow {
  setId: string;
  setName: string;
  owned: number;
  total: number | null;
  printedTotal: number | null;
}

export function SetsView() {
  const [sets, setSets] = useState<SetRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ sets: SetRow[] }>("/api/sets")
      .then((r) => setSets(r.sets))
      .catch((err) => setError(err instanceof ClientApiError ? err.message : "Network error."));
  }, []);

  if (error) return <p role="alert" className="text-red-800">{error}</p>;
  if (!sets) return <p aria-busy="true">Loading sets…</p>;
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">Set completion</h1>
        <p className="text-slate-700">
          Sets you own cards from. A card counts once, whatever its finish; totals include secret rares, so they can exceed
          the number printed on the cards.
        </p>
      </div>
      {sets.length === 0 ? (
        <p className="rounded-md border border-slate-200 bg-white p-4">Add cards to your collection to track sets.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sets.map((s) => {
            const pct = s.total ? Math.round((s.owned / s.total) * 100) : null;
            return (
              <li key={s.setId}>
                <Link href={`/sets/${encodeURIComponent(s.setId)}`} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-400">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{s.setName}</span>
                    <span className="text-sm text-slate-700">
                      {s.owned} / {s.total ?? "?"} {pct !== null && `(${pct}%)`}
                    </span>
                  </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                    <span className="block h-full rounded-full bg-brand-700" style={{ width: `${pct ?? 0}%` }} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
