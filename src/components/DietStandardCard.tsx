"use client";

import { useActionState } from "react";
import { saveDietStandard, type PenNameState } from "@/actions/account";
import { DIET_STANDARDS } from "@/lib/diet";

export function DietStandardCard({ current }: { current: string[] }) {
  const [state, action, pending] = useActionState<PenNameState, FormData>(
    saveDietStandard,
    undefined
  );

  return (
    <form action={action} className="bg-white rounded-xl border border-stone-200 p-4 mt-4">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
        Your dietary standard
      </p>
      <p className="text-sm text-stone-600 mt-1">
        Pick what you personally need and the whole site filters to it — searches, listings, the
        lot. Leave everything unticked to see all businesses.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {DIET_STANDARDS.map((s) => (
          <label
            key={s.slug}
            title={s.hint}
            className="cursor-pointer text-xs border border-stone-300 rounded-full px-2.5 py-1.5 has-checked:bg-brand-700 has-checked:text-white has-checked:border-brand-700 hover:border-brand-600 select-none"
          >
            <input
              type="checkbox"
              name="standards"
              value={s.slug}
              defaultChecked={current.includes(s.slug)}
              className="sr-only"
            />
            {s.label}
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        This is private. It&apos;s never shown on your reviews or anywhere public.
      </p>
      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-brand-700">✓ Saved.</p>}
      <button
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Saving…" : "Save standard"}
      </button>
    </form>
  );
}
