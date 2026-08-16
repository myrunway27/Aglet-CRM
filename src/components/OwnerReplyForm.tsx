"use client";

import { useActionState } from "react";
import { replyToReview, type FormState } from "@/actions/owner";

export function OwnerReplyForm({
  reviewId,
  existingText,
}: {
  reviewId: string;
  existingText?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    replyToReview,
    undefined
  );

  return (
    <details className="mt-2">
      <summary className="text-xs text-brand-700 font-medium cursor-pointer hover:underline">
        {existingText ? "Edit your reply" : "Reply as owner"}
      </summary>
      <form action={formAction} className="mt-2 space-y-2">
        <input type="hidden" name="reviewId" value={reviewId} />
        <textarea
          name="text"
          rows={3}
          required
          minLength={5}
          maxLength={2000}
          defaultValue={existingText}
          placeholder="Respond publicly to this review…"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-xs text-brand-800">✓ Reply posted.</p>}
        <button
          disabled={pending}
          className="rounded-lg bg-brand-700 text-white px-3 py-1.5 text-sm font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
        >
          {pending ? "Posting…" : existingText ? "Update reply" : "Post reply"}
        </button>
      </form>
    </details>
  );
}
