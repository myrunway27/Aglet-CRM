"use client";

import { useActionState } from "react";
import { reportReview, type FormState } from "@/actions/review";

export function ReportForm({ reviewId, slug }: { reviewId: string; slug: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(reportReview, undefined);

  if (state && !state.error) {
    return <p className="text-xs text-brand-800 mt-2">✓ Reported. A moderator will take a look.</p>;
  }

  return (
    <details className="mt-2">
      <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-700">
        Report this review
      </summary>
      <form action={formAction} className="mt-2 space-y-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <input type="hidden" name="slug" value={slug} />
        <textarea
          name="reason"
          rows={2}
          required
          minLength={10}
          maxLength={1000}
          placeholder="Why does this look fake or abusive?"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        <button
          disabled={pending}
          className="rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium hover:bg-stone-300 disabled:opacity-50 cursor-pointer"
        >
          {pending ? "Sending…" : "Send report"}
        </button>
      </form>
    </details>
  );
}
