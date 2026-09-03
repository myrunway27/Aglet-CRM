"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, isFoodCategory } from "@/lib/categories";
import { ACCESS_TAGS, AMENITY_TAGS, DIET_TAGS } from "@/lib/tags";
import { DIET_STANDARDS } from "@/lib/diet";
import { RADII } from "@/lib/geo";

// The handful of filters most people reach for; the rest sit behind "More".
const FEATURED_FOOD = ["kosher", "vegan", "vegetarian", "gluten-free", "delivery", "outdoor-seating"];
const FEATURED_GENERAL = [
  "kid-friendly", "wheelchair-accessible", "parking", "free-wifi", "open-late", "budget-friendly",
];

const RATING_FLOORS = [
  { value: 0, label: "Any rating" },
  { value: 4.5, label: "4.5★ & up" },
  { value: 4, label: "4★ & up" },
  { value: 3.5, label: "3.5★ & up" },
  { value: 3, label: "3★ & up" },
];

type Next = {
  category?: string;
  tags?: string[];
  prices?: number[];
  openNow?: boolean;
  sort?: string;
  minRating?: number;
  withPhotos?: boolean;
  near?: string;
  radius?: number;
};

export function FilterBar({
  q,
  category,
  activeTags,
  prices,
  openNow,
  sort,
  minRating,
  withPhotos,
  near,
  radius,
}: {
  q?: string;
  category?: string;
  activeTags: string[];
  prices: number[];
  openNow: boolean;
  sort: string;
  minRating: number;
  withPhotos: boolean;
  near: string;
  radius: number;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const go = (next: Next) => {
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
    const mr = next.minRating !== undefined ? next.minRating : minRating;
    if (mr) params.set("minRating", String(mr));
    const ph = next.withPhotos !== undefined ? next.withPhotos : withPhotos;
    if (ph) params.set("photos", "1");
    const nr = next.near !== undefined ? next.near : near;
    if (nr) params.set("near", nr);
    const rd = next.radius !== undefined ? next.radius : radius;
    if (nr && rd) params.set("radius", String(rd));
    const s = next.sort ?? sort;
    if (s && s !== "recommended") params.set("sort", s);
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  };

  const toggleTag = (slug: string) =>
    go({ tags: activeTags.includes(slug) ? activeTags.filter((x) => x !== slug) : [...activeTags, slug] });

  const togglePrice = (n: number) =>
    go({ prices: prices.includes(n) ? prices.filter((x) => x !== n) : [...prices, n] });

  // Location is asked for only when someone presses the button, and only the
  // rounded coordinates travel in the URL — never stored, never sent anywhere else.
  const useMyLocation = () => {
    if (near) {
      go({ near: "", sort: sort === "distance" ? "recommended" : sort });
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("This browser can't share a location.");
      return;
    }
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude.toFixed(4);
        const lng = pos.coords.longitude.toFixed(4);
        go({ near: `${lat},${lng}`, sort: "distance" });
      },
      () => {
        setLocating(false);
        setLocationError("Couldn't get your location — check browser permissions.");
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  // Food and dietary filters only make sense once a food category is chosen —
  // nobody needs to know whether a garage is gluten-free.
  const foodMode = isFoodCategory(category);
  const featured = foodMode ? FEATURED_FOOD : FEATURED_GENERAL;
  const show = (slug: string) => expanded || featured.includes(slug) || activeTags.includes(slug);

  const groups = [
    ...(foodMode ? [{ heading: "Food & dietary", tags: DIET_TAGS }] : []),
    { heading: "Amenities", tags: AMENITY_TAGS.filter((t) => foodMode || !t.food) },
    { heading: "Accessibility", tags: ACCESS_TAGS },
  ];

  const activeCount =
    activeTags.length + prices.length + (openNow ? 1 : 0) + (minRating ? 1 : 0) +
    (withPhotos ? 1 : 0) + (near ? 1 : 0);

  const chip = (on: boolean) =>
    `text-xs px-2.5 py-1.5 rounded-full border cursor-pointer ${
      on
        ? "bg-brand-600 text-white border-brand-600"
        : "bg-white border-stone-300 text-stone-600 hover:border-brand-600"
    }`;

  return (
    <div data-testid="filter-bar" className="bg-white rounded-xl border border-stone-200 p-3 space-y-2.5">
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
          <option value="recent">Recently reviewed</option>
          <option value="newest">Newest</option>
          {near && <option value="distance">Nearest</option>}
        </select>

        <select
          aria-label="Minimum rating"
          value={minRating}
          onChange={(e) => go({ minRating: Number(e.target.value) })}
          className="text-sm rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          {RATING_FLOORS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <button onClick={() => go({ openNow: !openNow })} className={chip(openNow)}>
          {openNow ? "✓ " : ""}Open now
        </button>

        <button onClick={useMyLocation} disabled={locating} className={chip(!!near)}>
          {locating ? "Locating…" : near ? "✓ Near me" : "📍 Near me"}
        </button>

        {near && (
          <select
            aria-label="Search radius"
            value={radius}
            onChange={(e) => go({ radius: Number(e.target.value) })}
            className="text-sm rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                within {r} mi
              </option>
            ))}
          </select>
        )}

        <button onClick={() => go({ withPhotos: !withPhotos })} className={chip(withPhotos)}>
          {withPhotos ? "✓ " : ""}📷 With photos
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
            onClick={() =>
              go({
                tags: [], prices: [], openNow: false, minRating: 0,
                withPhotos: false, near: "", sort: sort === "distance" ? "recommended" : sort,
              })
            }
            className="text-xs text-stone-500 hover:text-brand-700 underline cursor-pointer"
          >
            Clear ({activeCount})
          </button>
        )}
      </div>

      {locationError && <p className="text-xs text-red-600">{locationError}</p>}

      {groups.map((g) => {
        const visible = g.tags.filter((t) => show(t.slug));
        if (visible.length === 0) return null;
        return (
          <div key={g.heading} className="flex items-center gap-1.5 flex-wrap">
            {expanded && (
              <span className="text-[11px] uppercase tracking-wide text-stone-400 font-medium w-full">
                {g.heading}
              </span>
            )}
            {visible.map((t) => (
              <button key={t.slug} onClick={() => toggleTag(t.slug)} className={chip(activeTags.includes(t.slug))}>
                {activeTags.includes(t.slug) ? "✓ " : ""}
                {t.label}
              </button>
            ))}
          </div>
        );
      })}

      <div className="flex items-center gap-1.5 flex-wrap">
        {expanded &&
          foodMode &&
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
