"use client";

import { useActionState } from "react";
import { postReview, type FormState } from "@/actions/review";
import { StarInput } from "./StarInput";
import { QUICK_TAGS } from "@/lib/quicktags";

export function ReviewForm({
  businessId,
  slug,
  invite,
}: {
  businessId: string;
  slug: string;
  invite?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(postReview, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="slug" value={slug} />
      {invite && <input type="hidden" name="invite" value={invite} />}
      <div>
        <span className="text-sm font-medium">Your rating</span>
        <div className="mt-1">
          <StarInput name="rating" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" name="loved" className="peer sr-only" />
        <span className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm peer-checked:bg-rose-50 peer-checked:border-rose-400 peer-checked:text-rose-700">
          ♥ I love this place
        </span>
        <span className="text-xs text-stone-500">regardless of the score</span>
      </label>
      <fieldset>
        <legend className="text-sm font-medium">
          Quick tags <span className="text-stone-400 font-normal">(optional, up to 5)</span>
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {QUICK_TAGS.map((t) => (
            <label
              key={t.slug}
              className="cursor-pointer text-xs border border-stone-300 rounded-full px-2.5 py-1.5 has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white hover:border-brand-600 select-none"
            >
              <input type="checkbox" name="quickTags" value={t.slug} className="sr-only" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm font-medium">Your review</span>
        <textarea
          name="text"
          rows={4}
          required
          minLength={30}
          maxLength={4000}
          placeholder="What was your experience like? (at least 30 characters)"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-600"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">
          Photos <span className="text-stone-400 font-normal">(optional, up to 3)</span>
        </span>
        <input
          type="file"
          name="photos"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="mt-1 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-brand-800 file:font-medium file:cursor-pointer"
        />
      </label>
      <p className="text-xs text-stone-500">
        🕶️ Posted anonymously under a random pen name. The business will never see who you are.
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded-lg bg-brand-700 text-white px-5 py-2.5 font-medium hover:bg-brand-800 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Posting…" : "Post anonymous review"}
      </button>
    </form>
  );
}
