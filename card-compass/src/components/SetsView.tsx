"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClientApiError } from "@/lib/api-types";
import { api } from "@/lib/client-api";
import { ProgressRing } from "./ProgressRing";

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

  if (error) return <p role="alert" className="text-bad">{error}</p>;
  if (!sets) return <p aria-busy="true">Loading sets…</p>;
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">Set completion</h1>
        <p className="text-ink-2">
          Sets you own cards from. A card counts once, whatever its finish; totals include secret rares, so they can exceed
          the number printed on the cards.
        </p>
      </div>
      {sets.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface p-4">Add cards to your collection to track sets.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sets.map((s) => {
            return (
              <li key={s.setId}>
                <Link href={`/sets/${encodeURIComponent(s.setId)}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-ink">
                  <ProgressRing owned={s.owned} total={s.total ?? 0} />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-lg font-bold">{s.setName}</span>
                    <span className="block text-sm text-ink-2">
                      {s.owned} of {s.total ?? "?"} cards
                    </span>
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
