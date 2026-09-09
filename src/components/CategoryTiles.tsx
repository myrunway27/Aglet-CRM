import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { categoryArt, shortCategory } from "@/lib/categoryArt";

// The category row under the hero: a quiet line icon over a short label,
// one ink colour, the active one underlined in the brand orange. It sits on
// the white band beneath the search rather than inside the dark hero.
export function CategoryTiles({ active, q }: { active?: string; q?: string }) {
  const href = (c: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (active !== c) p.set("category", c);
    const qs = p.toString();
    return qs ? `/?${qs}` : "/";
  };
  return (
    <nav aria-label="Categories" className="scroll-row -mx-4 px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max sm:min-w-0 sm:justify-center gap-1 sm:gap-2">
        {CATEGORIES.filter((c) => c !== "Other").map((c) => {
          const art = categoryArt(c);
          const on = active === c;
          return (
            <li key={c}>
              <Link
                href={href(c)}
                aria-current={on ? "page" : undefined}
                className={`group flex flex-col items-center gap-1.5 px-3 sm:px-4 pt-3 pb-2.5 border-b-2 text-[13px] font-medium whitespace-nowrap transition ${
                  on
                    ? "border-brand-600 text-brand-800"
                    : "border-transparent text-stone-600 hover:text-brand-800 hover:border-line"
                }`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={on ? "text-brand-600" : "text-stone-500 group-hover:text-brand-800"}
                >
                  <path d={art.icon} />
                </svg>
                {shortCategory(c)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
