// The True Review identity.
//
// Letterforms drawn from scratch rather than set in a typeface: cap height
// 700, stems 128, horizontals at 89% of the stem and diagonals at 106% so
// they read evenly, with the U dipping below the baseline and the V apex
// overshooting — round and pointed shapes look short when they are
// geometrically exact.

/** The mark: an eight-ray sun with a star at its heart, on a red rounded square. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" rx="24" fill="#f2453d" />
      <g transform="translate(9,9) scale(0.82)">
        <g fill="#ffffff"><rect x="45.5" y="6" width="9" height="26" rx="4.5" transform="rotate(12 50 50)"/><rect x="45.5" y="6" width="9" height="26" rx="4.5" transform="rotate(57 50 50)"/><rect x="45.5" y="6" width="9" height="26" rx="4.5" transform="rotate(102 50 50)"/><rect x="45.5" y="6" width="9" height="26" rx="4.5" transform="rotate(147 50 50)"/><rect x="45.5" y="6" width="9" height="26" rx="4.5" transform="rotate(192 50 50)"/><rect x="45.5" y="6" width="9" height="26" rx="4.5" transform="rotate(237 50 50)"/><rect x="45.5" y="6" width="9" height="26" rx="4.5" transform="rotate(282 50 50)"/><rect x="45.5" y="6" width="9" height="26" rx="4.5" transform="rotate(327 50 50)"/><circle cx="50" cy="50" r="23"/></g><path d="M0,-10 L2.94,-3.09 L9.51,-3.09 L4.76,1.18 L6.24,7.09 L0,3.8 L-6.24,7.09 L-4.76,1.18 L-9.51,-3.09 L-2.94,-3.09 Z" transform="translate(50,50) scale(1.9)" fill="#f2453d"/>
      </g>
    </svg>
  );
}

/**
 * The logo: the mark beside "truereview" in a rounded, lowercase wordmark.
 * Ink follows the surface — white on the navy header, near-black on paper.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className="font-wordmark text-[26px] leading-none tracking-[-0.03em]">truereview</span>
    </span>
  );
}
