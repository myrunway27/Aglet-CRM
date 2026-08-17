"use client";

import { useState, useActionState, useTransition } from "react";
import { rerollPenName, choosePenName, type PenNameState } from "@/actions/account";

export function PenNameCard({ penName }: { penName: string | null }) {
  const [picking, setPicking] = useState(false);
  const [rolling, startRolling] = useTransition();
  const [pickState, pickAction, pickPending] = useActionState<PenNameState, FormData>(
    choosePenName,
    undefined
  );

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
            Your anonymous pen name
          </p>
          <p className="text-lg font-semibold mt-0.5">
            🕶️ {penName ?? "Assigned with your first review"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => startRolling(() => rerollPenName().then(() => {}))}
            disabled={rolling}
            className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 hover:border-brand-600 disabled:opacity-50 cursor-pointer"
          >
            {rolling ? "Spinning…" : "🎲 Spin a new one"}
          </button>
          <button
            onClick={() => setPicking((v) => !v)}
            className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 hover:border-brand-600 cursor-pointer"
          >
            ✏️ Pick my own
          </button>
        </div>
      </div>
      <p className="text-xs text-stone-500 mt-2">
        Every review you write appears under this name — never your email or real name. Businesses
        can&apos;t see who you are. Changing it renames all your past reviews too.
      </p>
      {picking && (
        <form action={pickAction} className="mt-3 flex gap-2 items-start">
          <input
            name="penName"
            required
            minLength={3}
            maxLength={30}
            placeholder="e.g. Midnight Foodie 7"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <button
            disabled={pickPending}
            className="rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
          >
            {pickPending ? "Saving…" : "Save"}
          </button>
        </form>
      )}
      {pickState?.error && <p className="mt-2 text-sm text-red-600">{pickState.error}</p>}
      {pickState?.ok && <p className="mt-2 text-sm text-brand-700">✓ Pen name updated.</p>}
    </div>
  );
}
