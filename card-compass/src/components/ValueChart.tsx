"use client";

import { useId, useState } from "react";
import { formatMinor } from "@/lib/money";

export interface Point {
  day: string;
  amountMinor: number;
  itemsPriced: number;
  itemsTotal: number;
}

const fmtDay = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

/**
 * Single-series value-over-time line (one chart per source/currency; never a
 * second y-axis). Hover or focus shows the value; a table view is included.
 */
export function ValueChart({ title, currency, points }: { title: string; currency: string; points: Point[] }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 160;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  if (points.length === 0) return null;
  const vals = points.map((p) => p.amountMinor);
  const max = Math.max(...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.amountMinor).toFixed(1)}`).join(" ");
  const active = hover ?? points.length - 1;
  const p = points[active];

  return (
    <figure className="grid gap-2 rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-slate-700" aria-live="polite">
          {fmtDay(p.day)}: <strong className="font-mono">{formatMinor(p.amountMinor, currency)}</strong>{" "}
          <span className="text-slate-600">({p.itemsPriced} of {p.itemsTotal} cards priced)</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label={`${title}, ${points.length} daily values`} onMouseLeave={() => setHover(null)}>
        <line x1={pad.l} x2={W - pad.r} y1={y(min)} y2={y(min)} stroke="#e2e8f0" strokeWidth="1" />
        <path d={path} fill="none" stroke="#4338ca" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#94a3b8" strokeWidth="1" />}
        {points.map((pt, i) => (
          <g key={pt.day}>
            <circle cx={x(i)} cy={y(pt.amountMinor)} r={i === active ? 5 : 4} fill="#4338ca" stroke="#ffffff" strokeWidth="2" />
            {/* Larger invisible hit target */}
            <rect
              x={x(i) - Math.max(6, (W - pad.l - pad.r) / points.length / 2)}
              y={0}
              width={Math.max(12, (W - pad.l - pad.r) / points.length)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
        <text x={pad.l} y={H - 6} fontSize="11" fill="#475569">{fmtDay(points[0].day)}</text>
        <text x={W - pad.r} y={H - 6} fontSize="11" fill="#475569" textAnchor="end">{fmtDay(points[points.length - 1].day)}</text>
      </svg>
      <details className="text-sm">
        <summary className="cursor-pointer text-slate-700">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-slate-600">
              <th scope="col" className="py-1 font-medium">Day</th>
              <th scope="col" className="py-1 text-right font-medium">Value ({currency})</th>
              <th scope="col" className="py-1 text-right font-medium">Cards priced</th>
            </tr>
          </thead>
          <tbody>
            {points.map((pt) => (
              <tr key={pt.day} className="border-t border-slate-100">
                <td className="py-1">{pt.day}</td>
                <td className="py-1 text-right font-mono">{formatMinor(pt.amountMinor, currency)}</td>
                <td className="py-1 text-right">{pt.itemsPriced}/{pt.itemsTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
