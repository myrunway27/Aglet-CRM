"use client";

import { useMemo, useState } from "react";
import { ReviewCard } from "./ReviewCard";

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

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = reviews.filter((r) => {
      if (minStars && r.rating < minStars) return false;
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
  }, [reviews, query, sort, minStars]);

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
        </div>
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
