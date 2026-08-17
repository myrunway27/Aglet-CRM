// The True Review identity.
//
// Letterforms drawn from scratch rather than set in a typeface: cap height
// 700, stems 128, horizontals at 89% of the stem and diagonals at 106% so
// they read evenly, with the U dipping below the baseline and the V apex
// overshooting — round and pointed shapes look short when they are
// geometrically exact.

/** The boxed T — the mark. Used alone as the favicon and app icon. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1000 1000" className={className} aria-hidden="true">
      <rect width="1000" height="1000" rx="215" fill="currentColor" />
      <path
        d="M10,0 H490 V114 H314 V700 H186 V114 H10 Z"
        transform="translate(250,144)"
        className="fill-[var(--logo-counter,#fff)]"
      />
    </svg>
  );
}

/** The wordmark, drawn to match the mark. */
export function Wordmark({ className = "h-4 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 4886 714" className={className} fill="currentColor" aria-hidden="true">
      <path fill-rule="nonzero" d="M10,0 H490 V114 H314 V700 H186 V114 H10 Z" transform="translate(0,0)"/><path fill-rule="evenodd" d="M0,0 H300 C396,0 466,79 466,176 C466,273 396,352 300,352 H128 V700 H0 Z M128,114 H296 C330,114 352,140 352,176 C352,212 330,238 296,238 H128 Z" transform="translate(538,0)"/><path fill-rule="nonzero" d="M158,262 L300,262 L486,700 L344,700 Z" transform="translate(538,0)"/><path fill-rule="nonzero" d="M30,0 L30,455 C30,640 130,710 265,710 C400,710 500,640 500,455 L500,0 L372,0 L372,455 C372,545 330,596 265,596 C200,596 158,545 158,455 L158,0 Z" transform="translate(1024,0)"/><path fill-rule="nonzero" d="M0,0 H400 V114 H128 V296 H370 V410 H128 V586 H400 V700 H0 Z" transform="translate(1548,0)"/><g transform="translate(2108,0)"><path fill-rule="evenodd" d="M0,0 H300 C396,0 466,79 466,176 C466,273 396,352 300,352 H128 V700 H0 Z M128,114 H296 C330,114 352,140 352,176 C352,212 330,238 296,238 H128 Z" transform="translate(0,0)"/><path fill-rule="nonzero" d="M158,262 L300,262 L486,700 L344,700 Z" transform="translate(0,0)"/><path fill-rule="nonzero" d="M0,0 H400 V114 H128 V296 H370 V410 H128 V586 H400 V700 H0 Z" transform="translate(498,0)"/><path fill-rule="nonzero" d="M0,0 H118 L232,500 L346,0 H464 L290,714 H174 Z" transform="translate(912,0)"/><path fill-rule="nonzero" d="M36,0 H164 V700 H36 Z" transform="translate(1400,0)"/><path fill-rule="nonzero" d="M0,0 H400 V114 H128 V296 H370 V410 H128 V586 H400 V700 H0 Z" transform="translate(1604,0)"/><path fill-rule="nonzero" d="M0,0 H118 L232,500 L346,0 H464 L290,714 H174 Z" transform="translate(2018,0)"/><path fill-rule="nonzero" d="M296,0 H414 L528,500 L642,0 H760 L586,714 H470 Z" transform="translate(2018,0)"/></g>
    </svg>
  );
}

/** Mark + wordmark, at the fixed size relationship they were drawn for. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-8 w-8 shrink-0" />
      <Wordmark className="h-[13px] w-auto" />
      <span className="sr-only">True Review</span>
    </span>
  );
}
