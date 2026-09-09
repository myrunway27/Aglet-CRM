import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { categoryArt, shortCategory } from "@/lib/categoryArt";

// One horizontal row of icon + label chips, 44px tall, scrolling on small
// screens. Each chip carries its category's colour so the row has rhythm.
export function CategoryTiles({
  active,
  q,
  onDark = false,
}: {
  active?: string;
  q?: string;
  onDark?: boolean;
}) {
  const href = (c: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (active !== c) p.set("category", c);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };
  return (
    <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap sm:justify-center">
        {CATEGORIES.filter((c) => c !== "Other").map((c) => {
          const art = categoryArt(c);
          const on = active === c;
          return (
            <Link
              key={c}
              href={href(c)}
              className={`inline-flex items-center gap-2 h-11 pl-2 pr-3.5 rounded-full text-[13.5px] font-semibold whitespace-nowrap transition ${
                on
                  ? "bg-white text-brand-800 shadow-md ring-2 ring-star"
                  : onDark
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-white text-stone-800 border border-line hover:border-brand-600/50 hover:shadow-sm"
              }`}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: on || !onDark ? art.tint : art.pop, color: on || !onDark ? art.ink : "#0b1020" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={art.icon} />
                </svg>
              </span>
              {shortCategory(c)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
