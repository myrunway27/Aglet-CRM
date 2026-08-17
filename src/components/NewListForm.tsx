"use client";

import { useActionState } from "react";
import { createList, type SimpleState } from "@/actions/saves";

export function NewListForm() {
  const [state, action, pending] = useActionState<SimpleState, FormData>(createList, undefined);

  return (
    <form action={action} className="bg-white rounded-xl border border-stone-200 p-4 space-y-2">
      <input
        name="title"
        required
        minLength={3}
        maxLength={80}
        placeholder="List name — e.g. “Kosher dairy in Queens, ranked”"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
      />
      <input
        name="note"
        maxLength={500}
        placeholder="A line about it (optional)"
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
      />
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" name="isPublic" className="rounded" />
        Anyone with the link can see it
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand-700">✓ List created.</p>}
      <button
        disabled={pending}
        className="rounded-lg bg-brand-700 text-white px-4 py-2 text-sm font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Creating…" : "Create list"}
      </button>
    </form>
  );
}
