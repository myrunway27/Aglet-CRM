"use client";

import { useEffect, useState } from "react";
import { finishLabel } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import type { SeriesPoint } from "@/lib/history";
import { SOURCES, subtypeLabel, type SourceId } from "@/lib/prices";
import { ValueChart } from "./ValueChart";

interface Series {
  source: SourceId;
  subtype: string;
  finish: string;
  currency: string;
  isDemo: boolean;
  points: SeriesPoint[];
}

/** Stored reference-price history for the confirmed finish, one chart per source. */
export function PriceHistory({ cardId, finish }: { cardId: string; finish: string }) {
  const [days, setDays] = useState<30 | 90 | 365>(90);
  const [series, setSeries] = useState<Series[] | null>(null);
  useEffect(() => {
    api<{ series: Series[] }>(`/api/cards/${encodeURIComponent(cardId)}/history?days=${days}`)
      .then((r) => setSeries(r.series))
      .catch(() => setSeries([]));
  }, [cardId, days]);

  const cmFinish = finish === "reverseHolofoil" ? "reverseHolofoil" : "unspecified";
  const shown = (series ?? []).filter(
    (s) => s.points.length > 1 && (s.source === "tcgplayer" ? s.finish === finish : s.finish === cmFinish),
  );

  return (
    <section aria-labelledby="hist-h" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="hist-h" className="text-xl font-semibold">Price history</h2>
        <div className="flex gap-2" role="group" aria-label="History range">
          {([30, 90, 365] as const).map((d) => (
            <button
              key={d}
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`rounded-full border px-3 py-1 text-sm ${days === d ? "border-ink bg-primary text-on-primary" : "border-line-strong bg-surface"}`}
            >
              {d === 365 ? "1 year" : `${d} days`}
            </button>
          ))}
        </div>
      </div>
      {series === null ? (
        <div aria-busy="true" className="h-40 animate-pulse rounded-xl bg-sunken-2" />
      ) : shown.length === 0 ? (
        <p className="rounded-lg bg-sunken px-3 py-2 text-sm">
          No stored history for this finish yet. History builds up daily once a card is looked up, collected, wishlisted or on
          an alert.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((s) => (
            <ValueChart
              key={`${s.source}-${s.finish}`}
              title={`${SOURCES[s.source].label} ${subtypeLabel(s.subtype).toLowerCase()}, ${finishLabel(s.finish)}${s.isDemo ? " (demo)" : ""}`}
              currency={s.currency}
              points={s.points}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-muted">Reference prices recorded by Card Compass, not completed sales.</p>
    </section>
  );
}
