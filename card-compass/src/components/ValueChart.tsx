"use client";

import { useId, useState } from "react";
import { formatMinor } from "@/lib/money";

export interface Point {
  day: string;
  amountMinor: number;
  itemsPriced?: number;
  itemsTotal?: number;
}

const fmtDay = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

/**
 * Single-series value-over-time line (one chart per source/currency; never a
 * second y-axis). Hover or focus shows the value; a table view is included.
 */
export function ValueChart({
  title,
  currency,
  points,
  unit = "daily values",
}: {
  title: string;
  currency: string;
  points: Point[];
  unit?: string;
}) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 160;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  if (points.length === 0) return null;
  if (points.length === 1) {
    return (
      <figure className="grid gap-1 rounded-2xl border border-line bg-surface p-4">
        <figcaption className="font-display font-bold">{title}</figcaption>
        <p className="text-sm text-ink-2">
          History starts today at <strong className="font-num">{formatMinor(points[0].amountMinor, currency)}</strong>. A chart
          appears once there are two days of values.
        </p>
      </figure>
    );
  }
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
    <figure className="grid gap-2 rounded-xl border border-line bg-surface p-4" aria-labelledby={`${id}-t`}>
      <figcaption id={`${id}-t`} className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-ink-2" aria-live="polite">
          {fmtDay(p.day)}: <strong className="font-mono">{formatMinor(p.amountMinor, currency)}</strong>{" "}
          {p.itemsTotal !== undefined && (
            <span className="text-muted">({p.itemsPriced} of {p.itemsTotal} cards priced)</span>
          )}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label={`${title}, ${points.length} ${unit}`} onMouseLeave={() => setHover(null)}>
        <line x1={pad.l} x2={W - pad.r} y1={y(min)} y2={y(min)} style={{ stroke: "var(--line)" }} strokeWidth="1" />
        <path d={`${path} L${x(points.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`} style={{ fill: "var(--chart)", opacity: 0.08 }} />
        <path d={path} fill="none" style={{ stroke: "var(--chart)" }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} style={{ stroke: "var(--line-strong)" }} strokeWidth="1" />}
        {points.map((pt, i) => (
          <g key={pt.day}>
            <circle cx={x(i)} cy={y(pt.amountMinor)} r={i === active ? 5 : 4} style={{ fill: "var(--chart)", stroke: "var(--surface)" }} strokeWidth="2" opacity={i === active || points.length < 40 ? 1 : 0} />
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
        <text x={pad.l} y={pad.t + 10} fontSize="11" style={{ fill: "var(--muted)" }}>{formatMinor(max, currency)}</text>
        <text x={pad.l} y={H - 6} fontSize="11" style={{ fill: "var(--muted)" }}>{fmtDay(points[0].day)}</text>
        <text x={W - pad.r} y={H - 6} fontSize="11" style={{ fill: "var(--muted)" }} textAnchor="end">{fmtDay(points[points.length - 1].day)}</text>
      </svg>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-2">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead>
            <tr className="text-muted">
              <th scope="col" className="py-1 font-medium">Day</th>
              <th scope="col" className="py-1 text-right font-medium">Value ({currency})</th>
              {points[0].itemsTotal !== undefined && <th scope="col" className="py-1 text-right font-medium">Cards priced</th>}
            </tr>
          </thead>
          <tbody>
            {points.map((pt) => (
              <tr key={pt.day} className="border-t border-line">
                <td className="py-1">{pt.day}</td>
                <td className="py-1 text-right font-mono">{formatMinor(pt.amountMinor, currency)}</td>
                {pt.itemsTotal !== undefined && <td className="py-1 text-right">{pt.itemsPriced}/{pt.itemsTotal}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
