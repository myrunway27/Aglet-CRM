"use client";

import { useState, useActionState } from "react";
import { flagReview, type DisputeState } from "@/actions/dispute";

export function DisputeForm({
  reviewId,
  alreadyDisputed,
}: {
  reviewId: string;
  alreadyDisputed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DisputeState, FormData>(flagReview, undefined);

  if (alreadyDisputed || state?.ok) {
    return (
      <p className="mt-2 text-xs text-stone-500">
        Disputed — a moderator is reviewing your evidence. The review stays visible while we look.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-stone-500 hover:text-brand-700 underline cursor-pointer"
      >
        Dispute this review
      </button>
    );
  }

  return (
    <form action={action} className="mt-2 space-y-2 border-t border-stone-200 pt-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <textarea
        name="evidence"
        rows={3}
        required
        minLength={30}
        maxLength={2000}
        placeholder="What's wrong with this review, and what evidence do you have? e.g. we have no record of this order, or it describes a different business."
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
      />
      <p className="text-xs text-stone-500">
        Disputes never delete a review. If upheld it stops counting toward your rating but stays
        readable — that&apos;s deliberate.
      </p>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="text-xs rounded-lg bg-brand-700 text-white px-3 py-1.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
        >
          {pending ? "Sending…" : "Submit dispute"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-stone-500 hover:underline cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
