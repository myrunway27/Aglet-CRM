import Link from "next/link";
import { Stars } from "./Stars";
import { tagLabel } from "@/lib/tags";
import { PRICE_LABELS } from "@/lib/hours";
import { categoryArt } from "@/lib/categoryArt";
import { isStale, timeAgo } from "@/lib/freshness";
import { formatMiles } from "@/lib/geo";

// The classic review-site result: numbered, square photo on the left, the
// name as the link, stars and count, "$$ · Thai", where it is, whether it is
// open, a line of what people say, and the amenities that matter. Dense on
// purpose — every line is a fact about a real place.
export function ResultRow(props: {
  index: number;
  slug: string;
  name: string;
  category: string;
  cuisine?: string;
  city: string;
  address?: string;
  avgRating: number | null;
  reviewCount: number;
  verifiedOwner: boolean;
  tags?: string[];
  priceLevel?: number;
  openLabel?: string | null;
  cityRank?: number;
  cityRankSize?: number;
  lastReviewedAt?: Date | null;
  miles?: number | null;
  photo?: string | null;
  excerpt?: string | null;
}) {
  const {
    index, slug, name, category, cuisine = "", city, address = "", avgRating, reviewCount,
    verifiedOwner, tags = [], priceLevel = 0, openLabel = null, cityRank = 0, cityRankSize = 0,
    lastReviewedAt = null, miles = null, photo = null, excerpt = null,
  } = props;
  const art = categoryArt(category);
  const stale = isStale(lastReviewedAt);
  const kind = [priceLevel > 0 ? PRICE_LABELS[priceLevel] : null, cuisine || category].filter(Boolean).join(" · ");
  const closed = openLabel?.startsWith("Closed");
  const shownTags = tags.filter((t) => !["kosher", "vegan", "vegetarian", "halal", "gluten-free"].includes(t)).slice(0, 4);
  const dietTags = tags.filter((t) => ["kosher", "vegan", "vegetarian", "halal", "gluten-free"].includes(t)).slice(0, 3);

  return (
    <article className="flex gap-4 sm:gap-5 py-5 border-b border-line">
      <Link
        href={`/business/${slug}`}
        className="relative shrink-0 w-[96px] h-[96px] sm:w-[168px] sm:h-[168px] rounded-xl overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${art.tint} 0%, ${art.pop} 140%)`, color: art.ink }}
        aria-label={name}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <span className="absolute -right-2 -bottom-6 font-display text-[96px] sm:text-[150px] leading-none select-none" style={{ opacity: 0.16 }} aria-hidden="true">
              {name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="absolute left-2.5 bottom-2.5 sm:left-3.5 sm:bottom-3.5 w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-white/85">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={art.icon} /></svg>
            </span>
          </>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-bold text-[17px] sm:text-[19px] leading-snug">
            <span className="text-stone-400 font-semibold mr-1.5">{index}.</span>
            <Link href={`/business/${slug}`} className="text-brand-800 hover:text-brand-700 hover:underline">{name}</Link>
            {verifiedOwner && (
              <span className="ml-2 align-middle text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5">✓ Claimed</span>
            )}
          </h3>
          {miles !== null && <span className="shrink-0 text-[12.5px] text-stone-500 mt-1">{formatMiles(miles)}</span>}
        </div>

        <div className="mt-1 flex items-center gap-2 text-[14px] flex-wrap">
          {avgRating !== null ? (
            <>
              <Stars rating={avgRating} />
              <span className="font-bold">{avgRating.toFixed(1)}</span>
              <span className="text-stone-500">({reviewCount} review{reviewCount !== 1 ? "s" : ""})</span>
            </>
          ) : (
            <span className="text-stone-500">No reviews yet</span>
          )}
          {cityRank > 0 && (
            <span className="text-[12.5px] font-semibold text-brand-700">· #{cityRank} of {cityRankSize} in {city}</span>
          )}
        </div>

        <p className="mt-1 text-[14px] text-stone-700">
          <span className="font-medium">{kind}</span>
          {(address || city) && <span className="text-stone-500"> · {address ? `${address}, ${city}` : city}</span>}
        </p>

        {openLabel && (
          <p className={`mt-0.5 text-[13.5px] font-semibold ${closed ? "text-red-600" : "text-emerald-700"}`}>{openLabel}</p>
        )}

        {excerpt ? (
          <p className="mt-2 text-[14px] text-stone-700 leading-snug line-clamp-2">
            <span className="text-stone-400">“</span>{excerpt}<span className="text-stone-400">”</span>
          </p>
        ) : (
          <p className="mt-2 text-[13.5px] text-stone-500">
            Been here? <Link href={`/business/${slug}`} className="text-brand-700 font-medium hover:underline">Be the first to say what it's like →</Link>
          </p>
        )}

        {(shownTags.length > 0 || dietTags.length > 0) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {dietTags.map((t) => (
              <span key={t} className="text-[12px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">{tagLabel(t)}</span>
            ))}
            {shownTags.map((t) => (
              <span key={t} className="text-[12px] text-stone-700 bg-white border border-line px-2 py-0.5 rounded-md">{tagLabel(t)}</span>
            ))}
          </div>
        )}

        {lastReviewedAt && (
          <p className={`mt-2 text-[12px] ${stale ? "text-amber-700 font-medium" : "text-stone-400"}`}>
            {stale ? "⚠ " : ""}Last reviewed {timeAgo(new Date(lastReviewedAt))}{stale && " — this rating may be out of date"}
          </p>
        )}
      </div>
    </article>
  );
}
