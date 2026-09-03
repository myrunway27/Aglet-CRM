"use client";

import { useMemo, useState } from "react";
import { ReviewCard } from "./ReviewCard";
import { parseQuickTags, quickTagLabel } from "@/lib/quicktags";

type R = React.ComponentProps<typeof ReviewCard>["review"];

const SORTS = [
  { key: "helpful", label: "Most helpful" },
  { key: "recent", label: "Newest" },
  { key: "high", label: "Highest rated" },
  { key: "low", label: "Lowest rated" },
] as const;

export function ReviewList({
  reviews,
  slug,
  businessName,
  viewerIsOwner,
  viewerIsLoggedIn,
  topics,
}: {
  reviews: R[];
  slug: string;
  businessName: string;
  viewerIsOwner: boolean;
  viewerIsLoggedIn: boolean;
  topics: { word: string; count: number }[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("helpful");
  const [minStars, setMinStars] = useState(0);
  const [onlyPhotos, setOnlyPhotos] = useState(false);
  const [tag, setTag] = useState("");

  // Only offer the tags people actually used on this business, with counts —
  // an empty filter is worse than no filter.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reviews) {
      for (const t of parseQuickTags(r.quickTags)) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [reviews]);

  const photoCount = useMemo(() => reviews.filter((r) => r.photos.length > 0).length, [reviews]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = reviews.filter((r) => {
      if (minStars && r.rating < minStars) return false;
      if (onlyPhotos && r.photos.length === 0) return false;
      if (tag && !parseQuickTags(r.quickTags).includes(tag)) return false;
      if (!q) return true;
      return r.text.toLowerCase().includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sort === "recent") return +new Date(b.createdAt) - +new Date(a.createdAt);
      if (sort === "high") return b.rating - a.rating;
      if (sort === "low") return a.rating - b.rating;
      return b.helpfulCount - a.helpfulCount || +new Date(b.createdAt) - +new Date(a.createdAt);
    });
    return list;
  }, [reviews, query, sort, minStars, onlyPhotos, tag]);

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search these reviews — “parking”, “gluten”…"
            className="flex-1 min-w-48 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={minStars}
            onChange={(e) => setMinStars(Number(e.target.value))}
            className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value={0}>All ratings</option>
            <option value={4}>4★ and up</option>
            <option value={3}>3★ and up</option>
            <option value={2}>2★ and up</option>
          </select>
          {photoCount > 0 && (
            <button
              onClick={() => setOnlyPhotos((v) => !v)}
              className={`text-sm rounded-lg border px-2.5 py-1.5 cursor-pointer ${
                onlyPhotos
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
              }`}
            >
              {onlyPhotos ? "✓ " : ""}📷 With photos ({photoCount})
            </button>
          )}
        </div>
        {tagCounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagCounts.map(([slug, count]) => (
              <button
                key={slug}
                onClick={() => setTag(tag === slug ? "" : slug)}
                className={`text-xs rounded-full border px-2.5 py-1 cursor-pointer ${
                  tag === slug
                    ? "bg-brand-700 text-white border-brand-700"
                    : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
                }`}
              >
                {quickTagLabel(slug)} <span className="opacity-60">×{count}</span>
              </button>
            ))}
          </div>
        )}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <button
                key={t.word}
                onClick={() => setQuery(query === t.word ? "" : t.word)}
                className={`text-xs rounded-full border px-2.5 py-1 cursor-pointer ${
                  query === t.word
                    ? "bg-brand-700 text-white border-brand-700"
                    : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
                }`}
              >
                {t.word} <span className="opacity-60">×{t.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {shown.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          slug={slug}
          businessName={businessName}
          viewerIsOwner={viewerIsOwner}
          viewerIsLoggedIn={viewerIsLoggedIn}
        />
      ))}
      {shown.length === 0 && (
        <p className="text-sm text-stone-500">
          {reviews.length === 0
            ? "Nothing here yet — be the first to review."
            : "No reviews match that filter."}
        </p>
      )}
    </div>
  );
}
