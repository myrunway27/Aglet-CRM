"use client";

import { useTransition } from "react";
import { confirmTag } from "@/actions/saves";
import { freshnessLabel, standardLabel, type Freshness } from "@/lib/diet";

export type DietClaim = {
  tag: string;
  lastConfirmed: string | null; // ISO
  freshness: Freshness;
  confirms: number;
  disputes: number;
};

const TONE: Record<Freshness, string> = {
  fresh: "bg-brand-50 border-brand-100 text-brand-800",
  aging: "bg-amber-50 border-amber-200 text-amber-800",
  stale: "bg-stone-100 border-stone-300 text-stone-500",
  unconfirmed: "bg-white border-stone-200 text-stone-600",
};

export function DietPanel({
  businessId,
  claims,
  canConfirm,
  certifier,
}: {
  businessId: string;
  claims: DietClaim[];
  canConfirm: boolean;
  certifier: string;
}) {
  const [pending, start] = useTransition();
  if (claims.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50/70 p-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
          Dietary details
        </span>
        {certifier && (
          <span className="text-xs text-stone-600">
            Certified by <strong>{certifier}</strong>
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1.5">
        {claims.map((c) => (
          <div
            key={c.tag}
            className={`rounded-lg border px-3 py-2 text-sm flex items-center justify-between gap-3 flex-wrap ${TONE[c.freshness]}`}
          >
            <span>
              <strong>{standardLabel(c.tag)}</strong>{" "}
              <span className="text-xs opacity-80">
                · {freshnessLabel(c.freshness, c.lastConfirmed ? new Date(c.lastConfirmed) : null)}
                {c.disputes > 0 && ` · ${c.disputes} said otherwise`}
              </span>
            </span>
            {canConfirm && (
              <span className="flex gap-1.5 shrink-0">
                <button
                  disabled={pending}
                  onClick={() => start(() => confirmTag(businessId, c.tag, true).then(() => {}))}
                  className="text-xs rounded-full border border-current px-2.5 py-1 cursor-pointer disabled:opacity-50 hover:bg-white/60"
                >
                  Still true
                </button>
                <button
                  disabled={pending}
                  onClick={() => start(() => confirmTag(businessId, c.tag, false).then(() => {}))}
                  className="text-xs rounded-full border border-current px-2.5 py-1 cursor-pointer disabled:opacity-50 hover:bg-white/60"
                >
                  No longer
                </button>
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        Dietary details go stale when kitchens change. Anyone who has visited can confirm them.
      </p>
    </div>
  );
}
