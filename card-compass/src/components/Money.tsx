import { formatMinor } from "@/lib/money";

/** Signed amount + percentage, colored with a text label (never color alone). */
export function Gain({ minor, currency, pct }: { minor: number; currency: string; pct: number | null }) {
  const up = minor > 0;
  const flat = minor === 0;
  const cls = flat ? "text-slate-700" : up ? "text-emerald-800" : "text-red-800";
  return (
    <span className={`font-mono ${cls}`}>
      {flat ? "±" : up ? "+" : "−"}
      {formatMinor(Math.abs(minor), currency)}
      {pct !== null && ` (${up ? "+" : flat ? "" : "−"}${Math.abs(pct * 100).toFixed(1)}%)`}
      <span className="sr-only">{flat ? " no change" : up ? " gain" : " loss"}</span>
    </span>
  );
}
