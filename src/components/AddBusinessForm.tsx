"use client";

import { useActionState } from "react";
import { addBusiness, type FormState } from "@/actions/business";
import { CATEGORIES } from "@/lib/categories";

export function AddBusinessForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addBusiness, undefined);

  return (
    <form
      action={formAction}
      className="max-w-lg mx-auto bg-white rounded-xl border border-stone-200 p-6 mt-4 space-y-4"
    >
      <label className="block">
        <span className="text-sm font-medium">Business name</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Category</span>
        <select
          name="category"
          required
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="">Choose…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-medium">City</span>
        <input
          name="city"
          required
          minLength={2}
          maxLength={60}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">
          Description <span className="text-stone-400 font-normal">(optional)</span>
        </span>
        <textarea
          name="description"
          rows={3}
          maxLength={1000}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-700 text-white py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Adding…" : "Add business"}
      </button>
    </form>
  );
}
