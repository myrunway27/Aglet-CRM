// The True Review identity: a square-cut "TR" monogram over five stars on a
// cream tile, in the logo's orange. Drawn as paths so it renders identically
// everywhere, down to a 16px favicon.

/** The mark: orange TR monogram and five stars on a cream rounded square. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" rx="20" fill="#f9e6cd" />
      <g fill="#f4711c">
        <rect x="11" y="15" width="38" height="13" />
        <rect x="24" y="15" width="13" height="59" />
        <path d="M53 15H70A18.5 18.5 0 0 1 70 52H66V74H53Z M66 28V39H70A5.5 5.5 0 0 0 70 28Z" fillRule="evenodd" />
        <path d="M66 50H80L92 74H78Z" />
        <path d="M0,-10 L2.94,-3.09 L9.51,-3.09 L4.76,1.18 L6.24,7.09 L0,3.8 L-6.24,7.09 L-4.76,1.18 L-9.51,-3.09 L-2.94,-3.09 Z" transform="translate(16,85) scale(0.8)" />
        <path d="M0,-10 L2.94,-3.09 L9.51,-3.09 L4.76,1.18 L6.24,7.09 L0,3.8 L-6.24,7.09 L-4.76,1.18 L-9.51,-3.09 L-2.94,-3.09 Z" transform="translate(33,85) scale(0.8)" />
        <path d="M0,-10 L2.94,-3.09 L9.51,-3.09 L4.76,1.18 L6.24,7.09 L0,3.8 L-6.24,7.09 L-4.76,1.18 L-9.51,-3.09 L-2.94,-3.09 Z" transform="translate(50,85) scale(0.8)" />
        <path d="M0,-10 L2.94,-3.09 L9.51,-3.09 L4.76,1.18 L6.24,7.09 L0,3.8 L-6.24,7.09 L-4.76,1.18 L-9.51,-3.09 L-2.94,-3.09 Z" transform="translate(67,85) scale(0.8)" />
        <path d="M0,-10 L2.94,-3.09 L9.51,-3.09 L4.76,1.18 L6.24,7.09 L0,3.8 L-6.24,7.09 L-4.76,1.18 L-9.51,-3.09 L-2.94,-3.09 Z" transform="translate(84,85) scale(0.8)" />
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
      <LogoMark className="h-8 w-8 sm:h-9 sm:w-9 shrink-0" />
      <span className="font-wordmark text-[22px] sm:text-[26px] leading-none tracking-[-0.03em]">truereview</span>
    </span>
  );
}
