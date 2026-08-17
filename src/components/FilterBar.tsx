"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { TAGS } from "@/lib/tags";
import { DIET_STANDARDS } from "@/lib/diet";

// The handful of filters most people reach for; the rest sit behind "More".
const FEATURED = ["kosher", "vegan", "vegetarian", "gluten-free", "kid-friendly", "delivery"];

export function FilterBar({
  q,
  category,
  activeTags,
  prices,
  openNow,
  sort,
}: {
  q?: string;
  category?: string;
  activeTags: string[];
  prices: number[];
  openNow: boolean;
  sort: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const go = (next: {
    category?: string;
    tags?: string[];
    prices?: number[];
    openNow?: boolean;
    sort?: string;
  }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const cat = next.category !== undefined ? next.category : category;
    if (cat) params.set("category", cat);
    const t = next.tags ?? activeTags;
    if (t.length) params.set("tags", t.join(","));
    const p = next.prices ?? prices;
    if (p.length) params.set("price", p.join(","));
    const o = next.openNow !== undefined ? next.openNow : openNow;
    if (o) params.set("open", "1");
    const s = next.sort ?? sort;
    if (s && s !== "recommended") params.set("sort", s);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const toggleTag = (slug: string) =>
    go({ tags: activeTags.includes(slug) ? activeTags.filter((x) => x !== slug) : [...activeTags, slug] });

  const togglePrice = (n: number) =>
    go({ prices: prices.includes(n) ? prices.filter((x) => x !== n) : [...prices, n] });

  const visibleTags = TAGS.filter(
    (t) => expanded || FEATURED.includes(t.slug) || activeTags.includes(t.slug)
  );
  const activeCount = activeTags.length + prices.length + (openNow ? 1 : 0);

  const chip = (on: boolean) =>
    `text-xs px-2.5 py-1.5 rounded-full border cursor-pointer ${
      on
        ? "bg-brand-600 text-white border-brand-600"
        : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
    }`;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          aria-label="Category"
          value={category ?? ""}
          onChange={(e) => go({ category: e.target.value })}
          className="text-sm rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort by"
          value={sort}
          onChange={(e) => go({ sort: e.target.value })}
          className="text-sm rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="recommended">Recommended</option>
          <option value="rating">Highest rated</option>
          <option value="reviews">Most reviewed</option>
          <option value="newest">Newest</option>
        </select>

        <button onClick={() => go({ openNow: !openNow })} className={chip(openNow)}>
          {openNow ? "✓ " : ""}Open now
        </button>

        <span className="flex gap-1">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => togglePrice(n)}
              className={chip(prices.includes(n))}
              aria-label={`Price level ${n}`}
            >
              {"$".repeat(n)}
            </button>
          ))}
        </span>

        {activeCount > 0 && (
          <button
            onClick={() => go({ tags: [], prices: [], openNow: false })}
            className="text-xs text-stone-500 hover:text-brand-700 underline cursor-pointer"
          >
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {visibleTags.map((t) => (
          <button key={t.slug} onClick={() => toggleTag(t.slug)} className={chip(activeTags.includes(t.slug))}>
            {activeTags.includes(t.slug) ? "✓ " : ""}
            {t.label}
          </button>
        ))}
        {expanded &&
          DIET_STANDARDS.map((s) => (
            <button
              key={s.slug}
              onClick={() => toggleTag(s.slug)}
              title={s.hint}
              className={chip(activeTags.includes(s.slug))}
            >
              {activeTags.includes(s.slug) ? "✓ " : ""}
              {s.label}
            </button>
          ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs px-2.5 py-1.5 rounded-full text-brand-700 hover:bg-brand-50 cursor-pointer font-medium"
        >
          {expanded ? "Less ▴" : "More filters ▾"}
        </button>
      </div>
    </div>
  );
}
