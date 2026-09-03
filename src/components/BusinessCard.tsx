import Link from "next/link";
import { Stars } from "./Stars";
import { tagLabel } from "@/lib/tags";
import { PRICE_LABELS } from "@/lib/hours";
import { isStale, timeAgo } from "@/lib/freshness";
import { formatMiles } from "@/lib/geo";

export function BusinessCard(props: {
  slug: string;
  name: string;
  category: string;
  city: string;
  avgRating: number | null;
  reviewCount: number;
  verifiedOwner: boolean;
  tags?: string[];
  priceLevel?: number;
  isOpen?: boolean | null;
  cityRank?: number;
  cityRankSize?: number;
  lastReviewedAt?: Date | null;
  miles?: number | null;
}) {
  const {
    slug, name, category, city, avgRating, reviewCount, verifiedOwner,
    tags = [], priceLevel = 0, isOpen = null, cityRank = 0, cityRankSize = 0,
    lastReviewedAt = null, miles = null,
  } = props;
  const stale = isStale(lastReviewedAt);
  return (
    <Link
      href={`/business/${slug}`}
      className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-brand-600 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{name}</h3>
        {verifiedOwner && (
          <span className="shrink-0 text-[11px] bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full">
            ✓ Owner verified
          </span>
        )}
      </div>
      <p className="text-sm text-stone-500 mt-0.5">
        {[category, city].filter(Boolean).join(" · ") || "Details coming"}
        {priceLevel > 0 && ` · ${PRICE_LABELS[priceLevel]}`}
        {isOpen !== null && (
          <span className={isOpen ? "text-brand-700 font-medium" : "text-stone-400"}>
            {" "}· {isOpen ? "Open now" : "Closed"}
          </span>
        )}
        {miles !== null && <span className="text-stone-500"> · {formatMiles(miles)}</span>}
      </p>
      {cityRank > 0 && (
        <p className="text-xs text-brand-700 font-medium mt-0.5">
          #{cityRank} of {cityRankSize} in {city}
        </p>
      )}
      {tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[11px] bg-brand-50 border border-brand-100 text-brand-800 px-2 py-0.5 rounded-full"
            >
              {tagLabel(t)}
            </span>
          ))}
          {tags.length > 4 && (
            <span className="text-[11px] text-stone-400 px-1 py-0.5">+{tags.length - 4}</span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
        {avgRating !== null ? (
          <>
            <Stars rating={avgRating} />
            <span className="font-medium">{avgRating.toFixed(1)}</span>
            <span className="text-stone-500">
              ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
            </span>
          </>
        ) : (
          <span className="text-stone-400">No reviews yet — be the first</span>
        )}
      </div>
      {lastReviewedAt && (
        <p className={`mt-1 text-xs ${stale ? "text-amber-700" : "text-stone-500"}`}>
          {stale ? "⚠ Last reviewed " : "Last reviewed "}
          {timeAgo(new Date(lastReviewedAt))}
          {stale && " — this rating may be out of date"}
        </p>
      )}
    </Link>
  );
}
