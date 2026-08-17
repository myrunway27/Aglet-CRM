"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { TAGS } from "@/lib/tags";

// The handful of filters most people reach for; the rest sit behind "More".
const FEATURED = ["kosher", "vegan", "vegetarian", "gluten-free", "kid-friendly", "delivery"];

export function FilterBar({
  q,
  category,
  activeTags,
}: {
  q?: string;
  category?: string;
  activeTags: string[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const navigate = (nextCategory: string | undefined, nextTags: string[]) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextCategory) params.set("category", nextCategory);
    if (nextTags.length) params.set("tags", nextTags.join(","));
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const toggleTag = (slug: string) =>
    navigate(
      category,
      activeTags.includes(slug) ? activeTags.filter((t) => t !== slug) : [...activeTags, slug]
    );

  // Selected tags always stay visible, even when collapsed.
  const visibleTags = TAGS.filter(
    (t) => expanded || FEATURED.includes(t.slug) || activeTags.includes(t.slug)
  );

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm text-stone-600 shrink-0" htmlFor="category-select">
          Category
        </label>
        <select
          id="category-select"
          value={category ?? ""}
          onChange={(e) => navigate(e.target.value || undefined, activeTags)}
          className="text-sm rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {(category || activeTags.length > 0) && (
          <button
            onClick={() => navigate(undefined, [])}
            className="text-xs text-stone-500 hover:text-brand-700 underline cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {visibleTags.map((t) => {
          const active = activeTags.includes(t.slug);
          return (
            <button
              key={t.slug}
              onClick={() => toggleTag(t.slug)}
              className={`text-xs px-2.5 py-1.5 rounded-full border cursor-pointer ${
                active
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
              }`}
            >
              {active ? "✓ " : ""}
              {t.label}
            </button>
          );
        })}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-2.5 py-1.5 rounded-full text-brand-700 hover:bg-brand-50 cursor-pointer font-medium"
        >
          {expanded ? "Less ▴" : `More filters ▾`}
        </button>
      </div>
    </div>
  );
}
