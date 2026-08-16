/* eslint-disable @next/next/no-img-element */
import { toggleHelpful } from "@/actions/review";
import { Stars } from "./Stars";
import { ReportForm } from "./ReportForm";
import { OwnerReplyForm } from "./OwnerReplyForm";

type ReviewData = {
  id: string;
  rating: number;
  text: string;
  pseudonym: string;
  createdAt: Date;
  photos: { id: string; path: string }[];
  ownerReply: { text: string; createdAt: Date } | null;
  helpfulCount: number;
  viewerVoted: boolean;
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
    <article className="bg-white rounded-xl border border-stone-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-sm">🕶️ {review.pseudonym}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Stars rating={review.rating} size="text-sm" />
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
        <OwnerReplyForm reviewId={review.id} existingText={review.ownerReply?.text} />
      )}
      {viewerIsLoggedIn && <ReportForm reviewId={review.id} slug={slug} />}
    </article>
  );
}
