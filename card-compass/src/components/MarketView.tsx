"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { finishLabel } from "@/lib/catalog/types";
import { api } from "@/lib/client-api";
import type { Mover } from "@/lib/history";
import { formatMinor } from "@/lib/money";
import { SOURCES, type SourceId } from "@/lib/prices";
import { DemoBanner } from "./DemoBanner";
import { Gain } from "./Money";

interface Data {
  windowDays: number;
  gainers: Mover[];
  losers: Mover[];
  cardsTracked: number;
  isDemo?: boolean;
}

function MoverTable({ title, rows }: { title: string; rows: Mover[] }) {
  return (
    <section className="grid content-start gap-2 rounded-xl border border-slate-200 bg-white p-4" aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-700">Not enough stored history yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-slate-600">
            <tr>
              <th scope="col" className="py-1 font-medium">Card</th>
              <th scope="col" className="py-1 text-right font-medium">Now</th>
              <th scope="col" className="py-1 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={`${m.catalogId}-${m.source}-${m.finish}`} className="border-t border-slate-100 align-top">
                <td className="py-1.5 pr-2">
                  <Link
                    href={`/cards/${encodeURIComponent(m.catalogId)}?finish=${m.finish === "unspecified" ? "normal" : m.finish}&lang=en&grading=raw&condition=NM`}
                    className="font-medium underline decoration-slate-300"
                  >
                    {m.name}
                  </Link>
                  <span className="block text-xs text-slate-600">
                    {m.setName} · {SOURCES[m.source as SourceId]?.label} {m.subtype} · {finishLabel(m.finish)}
                  </span>
                </td>
                <td className="py-1.5 text-right font-mono">{formatMinor(m.toMinor, m.currency)}</td>
                <td className="py-1.5 text-right">
                  <Gain minor={m.toMinor - m.fromMinor} currency={m.currency} pct={m.changePct} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function MarketView() {
  const [windowDays, setWindowDays] = useState<7 | 30>(7);
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    api<Data>(`/api/market/movers?window=${windowDays}`).then(setData).catch(() => setData(null));
  }, [windowDays]);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-bold">Market movers</h1>
        <p className="text-slate-700">
          Biggest reference-price changes (TCGplayer market, Cardmarket trend) among cards Card Compass has price history for
          {data ? ` (${data.cardsTracked} cards)` : ""}. Cards under 1.00 are ignored. These are reference prices, not sales.
        </p>
      </div>
      {data?.isDemo && <DemoBanner />}
      <div className="flex gap-2" role="group" aria-label="Time window">
        {([7, 30] as const).map((w) => (
          <button
            key={w}
            aria-pressed={windowDays === w}
            onClick={() => setWindowDays(w)}
            className={`rounded-full border px-3 py-1 text-sm ${windowDays === w ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white"}`}
          >
            {w} days
          </button>
        ))}
      </div>
      {!data ? (
        <p aria-busy="true">Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <MoverTable title={`Top gainers, ${data.windowDays} days`} rows={data.gainers} />
          <MoverTable title={`Top losers, ${data.windowDays} days`} rows={data.losers} />
        </div>
      )}
    </div>
  );
}
