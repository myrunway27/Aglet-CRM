import { Stars } from "./Stars";
import type { SnapshotData } from "@/lib/snapshot";

export function ReviewSnapshot({ data }: { data: SnapshotData }) {
  const { total, average, histogram, mentions } = data;
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <h2 className="font-semibold text-lg">At a glance</h2>
      <div className="mt-3 flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col items-center justify-center shrink-0">
          <span className="text-4xl font-bold">{average.toFixed(1)}</span>
          <Stars rating={average} />
          <span className="text-xs text-stone-500 mt-1">
            {total} review{total !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = histogram[star - 1];
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-right text-stone-600">{star} ★</span>
                <div className="flex-1 h-2.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-star rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-10 text-stone-500">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
      {mentions.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-3">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Reviewers mention
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {mentions.map((m) => (
              <span
                key={m.word}
                className="text-xs bg-brand-50 border border-brand-100 text-brand-800 px-2.5 py-1 rounded-full"
              >
                {m.word} <span className="text-brand-600">×{m.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
