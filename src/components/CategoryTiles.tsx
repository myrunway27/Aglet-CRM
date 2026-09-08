import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { categoryArt, shortCategory } from "@/lib/categoryArt";

// The primary way people browse on every major review site: a row of category
// tiles. Scrolls horizontally on small screens rather than wrapping into a wall.
export function CategoryTiles({ active, q }: { active?: string; q?: string }) {
  const href = (c: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (active !== c) p.set("category", c);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };
  return (
    <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2.5 sm:grid sm:grid-cols-6 lg:grid-cols-12 min-w-max sm:min-w-0">
        {CATEGORIES.filter((c) => c !== "Other").map((c) => {
          const art = categoryArt(c);
          const on = active === c;
          return (
            <Link
              key={c}
              href={href(c)}
              className={`flex flex-col items-center gap-2 rounded-2xl border px-3 py-3 w-[92px] sm:w-auto text-center transition ${
                on ? "border-brand-700 bg-brand-50" : "border-line bg-white hover:border-brand-600/50 hover:shadow-sm"
              }`}
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: art.tint, color: art.ink }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={art.icon} />
                </svg>
              </span>
              <span className="text-[12.5px] font-semibold leading-tight text-stone-800">{shortCategory(c)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
