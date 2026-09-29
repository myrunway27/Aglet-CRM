/** Circular completion meter (owned / total) with the percentage in the middle. */
export function ProgressRing({ owned, total, size = 56, label }: { owned: number; total: number; size?: number; label?: string }) {
  const pct = total > 0 ? Math.min(1, owned / total) : 0;
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" role="img" aria-label={label ?? `${owned} of ${total} (${Math.round(pct * 100)}%)`}>
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="4" style={{ stroke: "var(--sunken-2)" }} />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          style={{ stroke: pct >= 1 ? "var(--good)" : "var(--primary)" }}
        />
      </svg>
      <span className="absolute font-display text-[0.8rem] font-extrabold tabular-nums" aria-hidden>
        {Math.round(pct * 100)}%
      </span>
    </span>
  );
}
