/* eslint-disable @next/next/no-img-element */
"use client";

import { toggleHelpful } from "@/actions/review";
import { Stars } from "./Stars";
import { ReportForm } from "./ReportForm";
import { OwnerReplyForm } from "./OwnerReplyForm";
import { DisputeForm } from "./DisputeForm";
import { parseQuickTags, quickTagIsGood, quickTagLabel } from "@/lib/quicktags";

type ReviewData = {
  id: string;
  rating: number;
  loved: boolean;
  quickTags: string;
  viaInvite?: boolean;
  text: string;
  pseudonym: string;
  createdAt: Date;
  photos: { id: string; path: string }[];
  ownerReply: { text: string; createdAt: Date } | null;
  helpfulCount: number;
  viewerVoted: boolean;
  includedInScore: boolean;
  excludeReason: string | null;
  disputed: boolean;
  /** How many reviews this pen name has written — a trust cue for readers. */
  authorReviews?: number;
};

export function ReviewCard({
  review,
  slug,
  businessName,
  viewerIsOwner,
  viewerIsLoggedIn,
}: {
  review: ReviewData;
  slug: string;
  businessName: string;
  viewerIsOwner: boolean;
  viewerIsLoggedIn: boolean;
}) {
  return (
    <article
      className={`rounded-xl border p-4 ${
        review.includedInScore
          ? "bg-white border-stone-200"
          : "bg-stone-50 border-stone-300 border-dashed"
      }`}
    >
      {!review.includedInScore && (
        <p className="mb-2 text-xs text-stone-600 bg-stone-200/70 rounded-lg px-2.5 py-1.5">
          Not counted in the rating — {review.excludeReason ?? "under review"}. We leave it here to
          read rather than deleting it.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-sm">
            <a
              href={`/reviewer/${encodeURIComponent(review.pseudonym)}`}
              className="hover:underline"
            >
              🕶️ {review.pseudonym}
            </a>
            {typeof review.authorReviews === "number" && review.authorReviews > 1 && (
              <span className="ml-1.5 text-xs font-normal text-stone-500">
                · {review.authorReviews} reviews
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Stars rating={review.rating} size="text-sm" />
            <span className="text-xs text-stone-500">{review.rating.toFixed(1)}</span>
            {review.loved && (
              <span className="text-xs text-rose-600" title="Loves this place">
                ♥
              </span>
            )}
            <span className="text-xs text-stone-500">
              {review.createdAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {review.viaInvite && (
        <p className="mt-1 text-[11px] text-stone-500">
          <span
            className="bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full"
            title="The business invited this customer to leave a review. It is counted exactly like any other review."
          >
            Invited by the business
          </span>
        </p>
      )}
      {parseQuickTags(review.quickTags).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {parseQuickTags(review.quickTags).map((t) => (
            <span
              key={t}
              className={`text-[11px] rounded-full px-2 py-0.5 border ${
                quickTagIsGood(t)
                  ? "bg-brand-50 border-brand-100 text-brand-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {quickTagLabel(t)}
            </span>
          ))}
        </div>
      )}

      <p className="mt-2 text-sm whitespace-pre-wrap">{review.text}</p>

      {review.photos.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {review.photos.map((p) => (
            <a key={p.id} href={p.path} target="_blank" rel="noopener noreferrer">
              <img
                src={p.path}
                alt={`Photo from an anonymous review of ${businessName}`}
                className="h-24 w-24 object-cover rounded-lg border border-stone-200"
              />
            </a>
          ))}
        </div>
      )}

      {review.ownerReply && (
        <div className="mt-3 ml-3 border-l-2 border-brand-600 pl-3 py-1 bg-brand-50 rounded-r-lg">
          <p className="text-xs font-semibold text-brand-800">✓ Response from the owner</p>
          <p className="mt-1 text-sm whitespace-pre-wrap">{review.ownerReply.text}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-4">
        {viewerIsLoggedIn ? (
          <form action={toggleHelpful.bind(null, review.id, slug)}>
            <button
              className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer ${
                review.viewerVoted
                  ? "bg-brand-100 border-brand-600 text-brand-800"
                  : "border-stone-300 text-stone-600 hover:border-brand-600"
              }`}
            >
              👍 Helpful{review.helpfulCount > 0 ? ` · ${review.helpfulCount}` : ""}
            </button>
          </form>
        ) : (
          review.helpfulCount > 0 && (
            <span className="text-xs text-stone-500">
              👍 {review.helpfulCount} found this helpful
            </span>
          )
        )}
      </div>

      {viewerIsOwner && (
        <>
          <OwnerReplyForm reviewId={review.id} existingText={review.ownerReply?.text} />
          <DisputeForm reviewId={review.id} alreadyDisputed={review.disputed} />
        </>
      )}
      {viewerIsLoggedIn && <ReportForm reviewId={review.id} slug={slug} />}
    </article>
  );
}
