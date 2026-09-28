import type { CatalogCard } from "@/lib/catalog/types";
import { safeImageUrl } from "@/lib/safe-url";

const SIZES = {
  sm: { box: "w-14", name: "text-[8px]", num: "text-[7px]", pad: "p-[3px]", inner: "rounded-[3px]" },
  md: { box: "w-24 sm:w-40", name: "text-[11px] sm:text-sm", num: "text-[9px] sm:text-xs", pad: "p-[5px] sm:p-2", inner: "rounded-[5px] sm:rounded-md" },
  lg: { box: "w-40 sm:w-48", name: "text-sm", num: "text-xs", pad: "p-2", inner: "rounded-md" },
  fill: { box: "w-full", name: "text-xs sm:text-sm", num: "text-[10px] sm:text-xs", pad: "p-[5%]", inner: "rounded-[5px]" },
} as const;

/** Stable hue per card name, so each placeholder looks distinct but never changes. */
function hueFor(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/**
 * Card image from an allow-listed host. Without one (demo mode, or a card with
 * no image) we draw a stylised card: yellow border, coloured art panel, name
 * and number, with a foil sheen on holo/rare cards.
 */
export function CardArt({ card, size = "sm" }: { card: CatalogCard; size?: keyof typeof SIZES }) {
  const s = SIZES[size];
  const src = safeImageUrl(size === "sm" ? card.imageSmall : (card.imageLarge ?? card.imageSmall));
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote catalog art; host allow-listed above
      <img
        src={src}
        alt={`${card.name}, ${card.setName} ${card.number}`}
        className={`${s.box} aspect-[63/88] shrink-0 rounded-[6%/4.3%] object-cover shadow-md shadow-black/20`}
        loading="lazy"
      />
    );
  }
  const hue = hueFor(card.name);
  const shiny = /holo|rare|ex\b|gallery|double|secret|ultra/i.test(`${card.rarity ?? ""} ${card.name}`);
  return (
    <div
      role="img"
      aria-label={`${card.name}, ${card.setName} ${card.number} (no image)`}
      className={`${s.box} ${s.pad} relative aspect-[63/88] shrink-0 overflow-hidden rounded-[6%/4.3%] bg-[#ffcb2e] shadow-md shadow-black/20`}
    >
      <div
        className={`${s.inner} relative flex h-full flex-col overflow-hidden`}
        style={{ background: `linear-gradient(160deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 65% 38%))` }}
      >
        <span className={`${s.name} truncate px-[6%] pt-[5%] font-display font-bold leading-tight text-white drop-shadow`}>{card.name}</span>
        <span
          className="mx-[6%] mt-[4%] flex-[1.1] rounded-[3px] border border-white/40"
          style={{ background: `radial-gradient(circle at 50% 40%, hsl(${hue} 90% 85%), hsl(${hue} 60% 50%) 70%)` }}
        />
        <span className="flex-1" />
        <span className={`${s.num} px-[6%] pb-[5%] font-semibold text-white/90`}>#{card.number}</span>
        {shiny && <span aria-hidden className="foil pointer-events-none absolute inset-0 opacity-30 mix-blend-overlay" />}
      </div>
    </div>
  );
}
