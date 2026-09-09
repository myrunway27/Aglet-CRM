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
  /** "row": compact list row. "auto": row on phones, card from `sm` up. */
  variant?: "card" | "row" | "auto";
}) {
  const {
    slug, name, category, city, avgRating, reviewCount, verifiedOwner,
    tags = [], priceLevel = 0, isOpen = null, cityRank = 0, cityRankSize = 0,
    lastReviewedAt = null, miles = null, photo = null, variant = "card",
  } = props;
  const stale = isStale(lastReviewedAt);
  const art = categoryArt(category);
  const meta = [city, priceLevel > 0 ? PRICE_LABELS[priceLevel] : null].filter(Boolean).join(" · ");

  if (variant === "row" || variant === "auto") {
    const auto = variant === "auto";
    return (
      <Link
        href={`/business/${slug}`}
        className={`group flex items-center gap-3.5 bg-white rounded-2xl border border-line p-3 hover:border-brand-600/40 hover:shadow-sm transition ${
          auto ? "sm:block sm:p-0 sm:rounded-card sm:overflow-hidden sm:hover:shadow-md" : ""
        }`}
      >
        <span
          className={`relative shrink-0 w-[68px] h-[68px] rounded-xl overflow-hidden flex items-center justify-center ${
            auto ? "sm:w-full sm:h-44 sm:rounded-none" : ""
          }`}
          style={{ background: photo ? undefined : `linear-gradient(135deg, ${art.tint} 0%, ${art.pop} 140%)`, color: art.ink }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <>
              {auto && (
                <span
                  className="hidden sm:block absolute -right-3 -bottom-8 font-display text-[132px] leading-none select-none"
                  style={{ color: art.ink, opacity: 0.16 }}
                  aria-hidden="true"
                >
                  {name.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <span className={auto ? "sm:absolute sm:left-4 sm:bottom-4 sm:w-11 sm:h-11 sm:rounded-xl sm:flex sm:items-center sm:justify-center sm:bg-white/85 sm:shadow-sm" : ""}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={auto ? "sm:w-[22px] sm:h-[22px]" : ""}>
                  <path d={art.icon} />
                </svg>
              </span>
            </>
          )}
          {auto && avgRating !== null && (
            <span className="hidden sm:flex absolute top-3 left-3 items-center gap-1 bg-brand-800/90 text-white rounded-full pl-2 pr-2.5 py-1 text-[13px] font-bold tabular-nums">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5a524"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21l1.5-6.8L2.2 9.6l6.9-.7z" /></svg>
              {avgRating.toFixed(1)}
            </span>
          )}
          {auto && avgRating === null && (
            <span className="hidden sm:block absolute top-3 left-3 bg-white/90 text-stone-600 rounded-full px-2.5 py-1 text-[12px] font-medium">
              New — no reviews yet
            </span>
          )}
        </span>
        <span className={`min-w-0 flex-1 ${auto ? "sm:block sm:p-4" : ""}`}>
          <span className="flex items-center gap-2">
            <h3 className={`font-semibold text-[15.5px] leading-tight truncate ${auto ? "sm:text-[17px]" : ""}`}>{name}</h3>
            {verifiedOwner && <span className="shrink-0 text-[10px] font-bold text-brand-700 bg-brand-50 rounded-full px-1.5 py-0.5">✓</span>}
          </span>
          <span className="block text-[13px] text-stone-500 truncate mt-0.5">
            {category}
            {meta && ` · ${meta}`}
            {isOpen !== null && (
              <span className={isOpen ? " text-emerald-700 font-medium" : " text-stone-400"}> · {isOpen ? "Open" : "Closed"}</span>
            )}
          </span>
          <span className="block text-[12px] text-stone-400 truncate mt-0.5">
            {tags.length > 0 ? tags.slice(0, 2).map(tagLabel).join(" · ") : reviewCount > 0 ? `${reviewCount} review${reviewCount !== 1 ? "s" : ""}` : "Be the first to review"}
          </span>
          {lastReviewedAt && (
            <span className={`block text-[12px] mt-0.5 ${stale ? "text-amber-700 font-medium" : "text-stone-400"}`}>
              {stale ? "⚠ " : ""}Last reviewed {timeAgo(new Date(lastReviewedAt))}
              {stale && " — this rating may be out of date"}
            </span>
          )}
        </span>
        <span className={`shrink-0 flex flex-col items-end gap-1 ${auto ? "sm:hidden" : ""}`}>
          {avgRating !== null ? (
            <span className="inline-flex items-center gap-1 bg-brand-800 text-white rounded-full pl-2 pr-2.5 py-1 text-[13px] font-bold tabular-nums">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#f5a524"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 21l1.5-6.8L2.2 9.6l6.9-.7z" /></svg>
              {avgRating.toFixed(1)}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-stone-400 bg-stone-100 rounded-full px-2 py-1">New</span>
          )}
          {miles !== null && <span className="text-[11px] text-stone-500">{formatMiles(miles)}</span>}
        </span>
      </Link>
    );
  }

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
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${art.tint} 0%, ${art.pop} 140%)` }}>
            <span
              className="absolute -right-3 -bottom-8 font-display text-[132px] leading-none select-none"
              style={{ color: art.ink, opacity: 0.16 }}
              aria-hidden="true"
            >
              {name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="absolute left-4 bottom-4 w-11 h-11 rounded-xl flex items-center justify-center bg-white/85 shadow-sm" style={{ color: art.ink }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={art.icon} />
              </svg>
            </span>
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
          <span className="absolute bottom-3 right-3 bg-white/90 text-brand-700 rounded-full px-2 py-0.5 text-[11px] font-bold">
            ✓ Owner
          </span>
        )}
        {isOpen !== null && (
          <span
            className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
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
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
          <span className="whitespace-nowrap">
            {reviewCount > 0 ? `${reviewCount} review${reviewCount !== 1 ? "s" : ""}` : "Be the first to review"}
          </span>
          {lastReviewedAt && (
            <span className={`whitespace-nowrap ${stale ? "text-amber-700 font-medium" : ""}`}>
              {stale ? "⚠ " : ""}Last reviewed {timeAgo(new Date(lastReviewedAt))}
              {stale && " — this rating may be out of date"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
