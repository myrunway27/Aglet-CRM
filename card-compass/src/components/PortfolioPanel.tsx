"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { api } from "@/lib/client-api";
import { formatMinor } from "@/lib/money";
import type { Mover, PortfolioPoint } from "@/lib/portfolio";
import type { SourceId } from "@/lib/prices";
import { CardArt } from "./CardArt";

interface Data {
  empty: boolean;
  source: SourceId;
  sourceLabel?: string;
  currency: string;
  range: number;
  points?: PortfolioPoint[];
  nowMinor?: number;
  change1d?: { minor: number; pct: number } | null;
  change7d?: { minor: number; pct: number } | null;
  changeRange?: { minor: number; pct: number } | null;
  gainers?: Mover[];
  losers?: Mover[];
  cardsCounted?: number;
  cardsTotal?: number;
  isDemo?: boolean;
}

const SOURCE_TABS: Array<[SourceId, string]> = [
  ["tcgplayer", "TCGplayer"],
  ["cardmarket", "Cardmarket"],
  ["pricecharting", "Sales"],
];

const fmtDay = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

function ChangePill({ c, currency, label }: { c: { minor: number; pct: number } | null | undefined; currency: string; label: string }) {
  if (!c) return <span className="text-sm text-muted">{label}: not enough history</span>;
  const up = c.minor > 0;
  const flat = c.minor === 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${flat ? "bg-sunken text-ink-2" : up ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}`}
    >
      <span aria-hidden>{flat ? "•" : up ? "▲" : "▼"}</span>
      {flat ? "" : up ? "+" : "−"}
      {formatMinor(Math.abs(c.minor), currency)} ({Math.abs(c.pct * 100).toFixed(1)}%)
      <span className="font-medium opacity-80">{label}</span>
    </span>
  );
}

/** Area chart of portfolio value; green when up over the range, red when down. */
function PortfolioChart({ points, currency, up }: { points: PortfolioPoint[]; currency: string; up: boolean }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = 180;
  const pad = { t: 10, b: 8 };
  const shown = points.filter((p) => p.cardsPriced > 0);
  if (shown.length < 2) {
    return <p className="rounded-xl bg-sunken px-3 py-6 text-center text-sm text-ink-2">The chart appears once there are two days of prices.</p>;
  }
  const vals = shown.map((p) => p.valueMinor);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const span = max - min || 1;
  const x = (i: number) => (i / (shown.length - 1)) * W;
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const line = shown.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valueMinor).toFixed(1)}`).join(" ");
  const color = up ? "var(--good)" : "var(--bad)";
  const active = hover ?? shown.length - 1;
  const a = shown[active];

  return (
    <figure className="grid gap-2">
      <figcaption className="flex items-baseline justify-between text-xs text-muted" aria-live="polite">
        <span>{fmtDay(a.day)}</span>
        <span className="font-num font-semibold text-ink-2">{formatMinor(a.valueMinor, currency)}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-40 w-full touch-none sm:h-48"
        role="img"
        aria-label={`Collection value over ${shown.length} days, from ${formatMinor(shown[0].valueMinor, currency)} to ${formatMinor(shown[shown.length - 1].valueMinor, currency)}`}
        onPointerMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          setHover(Math.max(0, Math.min(shown.length - 1, Math.round(((e.clientX - r.left) / r.width) * (shown.length - 1)))));
        }}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" style={{ stroke: color }} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} style={{ stroke: "var(--line-strong)" }} strokeWidth="1" vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{fmtDay(shown[0].day)}</span>
        <span>{fmtDay(shown[shown.length - 1].day)}</span>
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">Show as table</summary>
        <table className="mt-1 w-full text-left">
          <tbody>
            {shown.map((p) => (
              <tr key={p.day} className="border-t border-line">
                <td className="py-0.5">{p.day}</td>
                <td className="py-0.5 text-right font-num">{formatMinor(p.valueMinor, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function MoverList({ title, movers, currency }: { title: string; movers: Mover[]; currency: string }) {
  return (
    <div className="grid content-start gap-2">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{title}</h3>
      {movers.length === 0 ? (
        <p className="text-sm text-muted">None in this period.</p>
      ) : (
        <ul className="grid gap-2">
          {movers.map((m) => {
            const up = m.toMinor > m.fromMinor;
            return (
              <li key={m.holdingId}>
                <Link href={`/cards/${encodeURIComponent(m.catalogId)}?finish=${m.finish}&lang=en&grading=raw&condition=NM`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-sunken">
                  <CardArt
                    size="sm"
                    card={{ catalogId: m.catalogId, name: m.name, number: m.number, setId: "", setName: m.setName, setSeries: null, setPrintedTotal: null, setPtcgoCode: null, releaseDate: null, rarity: null, imageSmall: null, imageLarge: null, finishes: [] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{m.name}</span>
                    <span className="block truncate text-xs text-muted">{m.setName} #{m.number}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-num font-semibold">{formatMinor(m.toMinor, currency)}</span>
                    <span className={`block text-xs font-bold ${up ? "text-good" : "text-bad"}`}>
                      {up ? "▲ +" : "▼ −"}
                      {Math.abs(m.changePct * 100).toFixed(1)}%
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

export function PortfolioPanel({ showCollectionLink = true }: { showCollectionLink?: boolean }) {
  const [source, setSource] = useState<SourceId | null>(null);
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = new URLSearchParams({ range: String(range), ...(source ? { source } : {}) });
      setData(await api<Data>(`/api/portfolio?${q}`));
      setError(false);
    } catch {
      setError(true);
    }
  }, [source, range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch when source/range change
    void load();
  }, [load]);

  if (error) return null;
  if (!data) return <div aria-busy="true" className="h-72 animate-pulse rounded-3xl bg-sunken" />;
  if (data.empty) {
    return (
      <section className="grid gap-2 rounded-3xl border border-line bg-surface p-6" aria-labelledby="pf-h">
        <h2 id="pf-h" className="text-xl font-bold">Your collection is empty</h2>
        <p className="text-ink-2">Scan a card or search below, then add it to your collection to track its value here.</p>
      </section>
    );
  }
  const up = (data.changeRange?.minor ?? 0) >= 0;

  return (
    <section aria-labelledby="pf-h" className="grid gap-5 rounded-3xl border border-line bg-surface p-5 shadow-sm sm:p-7" data-testid="portfolio">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="pf-h" className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Collection value · {data.sourceLabel}
          </h2>
          <p className="font-display text-4xl leading-none font-extrabold tabular-nums sm:text-5xl" data-testid="portfolio-value">
            {formatMinor(data.nowMinor ?? 0, data.currency)}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <ChangePill c={data.change1d} currency={data.currency} label="today" />
            <ChangePill c={data.changeRange} currency={data.currency} label={`${data.range} days`} />
          </div>
        </div>
        <div className="grid justify-items-end gap-2">
          <div className="flex rounded-full border border-line bg-surface-2 p-0.5 text-xs font-semibold" role="group" aria-label="Price source">
            {SOURCE_TABS.map(([s, label]) => (
              <button
                key={s}
                aria-pressed={data.source === s}
                onClick={() => setSource(s)}
                className={`rounded-full px-2.5 py-1 ${data.source === s ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-line bg-surface-2 p-0.5 text-xs font-semibold" role="group" aria-label="Time range">
            {[7, 30, 90].map((r) => (
              <button
                key={r}
                aria-pressed={data.range === r}
                onClick={() => setRange(r)}
                className={`rounded-full px-2.5 py-1 ${data.range === r ? "bg-ink text-bg" : "text-ink-2 hover:text-ink"}`}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <PortfolioChart points={data.points ?? []} currency={data.currency} up={up} />

      <div className="grid gap-4 sm:grid-cols-2">
        <MoverList title="Biggest gains" movers={data.gainers ?? []} currency={data.currency} />
        <MoverList title="Biggest drops" movers={data.losers ?? []} currency={data.currency} />
      </div>

      <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>
          Value of the cards you own now, using {data.sourceLabel} prices{data.isDemo ? " (demo data)" : ""}. {data.cardsCounted} of {data.cardsTotal} cards priced.
        </span>
        {showCollectionLink && (
          <Link href="/collection" className="font-semibold text-link underline">
            Open collection →
          </Link>
        )}
      </p>
    </section>
  );
}
