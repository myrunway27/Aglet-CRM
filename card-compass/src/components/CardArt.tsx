import type { CatalogCard } from "@/lib/catalog/types";
import { safeImageUrl } from "@/lib/safe-url";

/** Card image from an allow-listed host, or a neutral placeholder (always the case in mock mode). */
export function CardArt({ card, size = "sm" }: { card: CatalogCard; size?: "sm" | "lg" }) {
  const src = safeImageUrl(size === "lg" ? (card.imageLarge ?? card.imageSmall) : card.imageSmall);
  const dims = size === "lg" ? "w-40 sm:w-48" : "w-16";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote catalog art; host allow-listed above
      <img
        src={src}
        alt={`${card.name}, ${card.setName} ${card.number}`}
        className={`${dims} aspect-[63/88] shrink-0 rounded-md border border-slate-200 bg-slate-100 object-cover`}
        loading="lazy"
      />
    );
  }
  return (
    <div
      role="img"
      aria-label={`No image available for ${card.name}, ${card.setName} ${card.number}`}
      className={`${dims} flex aspect-[63/88] shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-100 p-1 text-center text-slate-600`}
    >
      <span className={size === "lg" ? "text-sm font-semibold" : "text-[10px] font-semibold leading-tight"}>{card.name}</span>
      <span className={size === "lg" ? "text-xs" : "text-[9px]"}>#{card.number}</span>
    </div>
  );
}
