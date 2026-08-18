import type { EarnedBadge } from "@/lib/badges";

/** Compact row of earned badges — used on a reviewer's record. */
export function BadgeRow({ badges, max = 8 }: { badges: EarnedBadge[]; max?: number }) {
  const shown = badges.slice(0, max);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((b) => (
        <span
          key={b.slug}
          title={`${b.meaning} — ${b.count}`}
          className="text-xs bg-brand-50 border border-brand-100 text-brand-800 px-2.5 py-1 rounded-full"
        >
          {b.icon} {b.label}
        </span>
      ))}
      {badges.length > max && (
        <span className="text-xs text-stone-400 px-1 py-1">+{badges.length - max}</span>
      )}
    </div>
  );
}

/** One or two badges inline beside a pen name on a review. */
export function BadgeChips({ badges }: { badges: { icon: string; label: string }[] }) {
  if (badges.length === 0) return null;
  return (
    <>
      {badges.map((b) => (
        <span
          key={b.label}
          className="text-[11px] bg-brand-50 border border-brand-100 text-brand-800 px-1.5 py-0.5 rounded-full"
        >
          {b.icon} {b.label}
        </span>
      ))}
    </>
  );
}

/** Full board with progress — shown to the reviewer on their own account. */
export function BadgeBoard({ badges }: { badges: EarnedBadge[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {badges.map((b) => {
        const earned = b.tier >= 0;
        const pct = b.next ? Math.min(100, Math.round((b.count / b.next) * 100)) : 100;
        return (
          <div
            key={b.slug}
            className={`rounded-xl border p-3 ${
              earned ? "bg-white border-brand-100" : "bg-stone-50 border-stone-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-xl ${earned ? "" : "grayscale opacity-40"}`}>{b.icon}</span>
              <span className="font-medium text-sm">
                {b.label ?? b.name}
                {!earned && <span className="text-stone-400 font-normal"> — not yet</span>}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-600">{b.how}</p>
            {b.next !== null ? (
              <>
                <div className="mt-2 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-600 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-stone-500 tabular-nums">
                  {b.count} / {b.next}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs text-brand-700 font-medium">Maxed out — {b.count}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
