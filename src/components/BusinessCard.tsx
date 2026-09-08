import Link from "next/link";
import { tagLabel } from "@/lib/tags";
import { PRICE_LABELS } from "@/lib/hours";
import { isStale, timeAgo } from "@/lib/freshness";
import { formatMiles } from "@/lib/geo";
import { categoryArt } from "@/lib/categoryArt";

// Photo-first card. The image carries the card; the rating sits on it as the
// loudest element, because the rating is what people came for. A business
// with no photos yet gets a category-tinted cover rather than a grey box.
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
  photo?: string | null;
}) {
  const {
    slug, name, category, city, avgRating, reviewCount, verifiedOwner,
    tags = [], priceLevel = 0, isOpen = null, cityRank = 0, cityRankSize = 0,
    lastReviewedAt = null, miles = null, photo = null,
  } = props;
  const stale = isStale(lastReviewedAt);
  const art = categoryArt(category);
  const meta = [city, priceLevel > 0 ? PRICE_LABELS[priceLevel] : null].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/business/${slug}`}
      className="group block bg-white rounded-card border border-line overflow-hidden hover:shadow-md hover:border-brand-600/40 transition"
    >
      <div className="relative h-40 sm:h-44 overflow-hidden" style={{ background: art.tint }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: art.ink }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
              <path d={art.icon} />
            </svg>
          </div>
        )}

        {avgRating !== null ? (
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-brand-800/90 text-white rounded-full pl-2 pr-2.5 py-1 text-[13px] font-bold tabular-nums">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5a524"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21l1.5-6.8L2.2 9.6l6.9-.7z" /></svg>
            {avgRating.toFixed(1)}
          </span>
        ) : (
          <span className="absolute top-3 left-3 bg-white/90 text-stone-600 rounded-full px-2.5 py-1 text-[12px] font-medium">
            New — no reviews yet
          </span>
        )}
        {verifiedOwner && (
          <span className="absolute top-3 right-3 bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-2 py-0.5 text-[11px] font-bold">
            ✓ Owner
          </span>
        )}
        {isOpen !== null && (
          <span
            className={`absolute bottom-3 left-3 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isOpen ? "bg-emerald-600 text-white" : "bg-white/90 text-stone-500"
            }`}
          >
            {isOpen ? "Open now" : "Closed"}
          </span>
        )}
        {miles !== null && (
          <span className="absolute bottom-3 right-3 bg-white/90 text-stone-700 rounded-full px-2 py-0.5 text-[11px] font-semibold">
            {formatMiles(miles)}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-[17px] leading-tight truncate">{name}</h3>
        <p className="text-sm text-stone-500 mt-0.5 truncate">
          {category}
          {meta && ` · ${meta}`}
        </p>
        {cityRank > 0 && (
          <p className="text-xs text-brand-700 font-semibold mt-1">
            #{cityRank} of {cityRankSize} in {city}
          </p>
        )}
        {tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[11.5px] bg-brand-50 border border-brand-100 text-brand-800 px-2 py-0.5 rounded-full"
              >
                {tagLabel(t)}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[11px] text-stone-400 px-1 py-0.5">+{tags.length - 3}</span>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
          <span>
            {reviewCount > 0 ? `${reviewCount} review${reviewCount !== 1 ? "s" : ""}` : "Be the first to review"}
          </span>
          {lastReviewedAt && (
            <span className={stale ? "text-amber-700 font-medium" : ""}>
              {stale ? "⚠ " : ""}Last reviewed {timeAgo(new Date(lastReviewedAt))}
              {stale && " — this rating may be out of date"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
