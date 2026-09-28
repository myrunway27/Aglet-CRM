/** Card Compass mark: a yellow-bordered card with a compass needle. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="5" y="2" width="22" height="28" rx="4" fill="#ffcb2e" />
      <rect x="8" y="5" width="16" height="22" rx="2" fill="#121634" />
      <path d="M16 8.5 19 16l-3 7.5L13 16z" fill="#ffcb2e" />
      <path d="M16 8.5 19 16h-6z" fill="#fff4cc" />
      <circle cx="16" cy="16" r="1.6" fill="#121634" />
    </svg>
  );
}
