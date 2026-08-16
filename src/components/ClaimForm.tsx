"use client";

import { useActionState } from "react";
import { submitClaim, type FormState } from "@/actions/owner";

export function ClaimForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(submitClaim, undefined);

  if (state?.ok) {
    return (
      <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm">
        <p className="font-medium text-brand-800">✓ Claim submitted.</p>
        <p className="mt-1 text-stone-600">
          An administrator will verify your evidence. Once approved, you&apos;ll get a verified-owner
          badge and can reply to reviews from the &ldquo;My businesses&rdquo; page.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      <label className="block">
        <span className="text-sm font-medium">How can we verify you own this business?</span>
        <textarea
          name="evidence"
          rows={4}
          required
          minLength={20}
          maxLength={2000}
          placeholder="e.g. a business email address we can contact, your business phone number, a link to your website or registration…"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </label>
      <p className="text-xs text-stone-500">
        This evidence is only visible to administrators — never published.
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-lg bg-brand-700 text-white px-5 py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
