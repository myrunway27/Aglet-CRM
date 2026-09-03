// How reviews are described in time. Recency is the single strongest signal
// people say they use — most look for reviews from the last few months — so
// the age of a business's newest review is worth showing plainly rather than
// leaving buried in the score maths.

/** Months after which a business's newest review is called out as old. */
export const STALE_MONTHS = 12;

const MS_MONTH = 1000 * 60 * 60 * 24 * 30.44;

/** "3 days ago", "2 months ago" — coarse on purpose, no false precision. */
export function timeAgo(date: Date, now = new Date()): string {
  const ms = now.getTime() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (days < 61) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(ms / MS_MONTH);
  if (months < 24) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function monthsSince(date: Date, now = new Date()): number {
  return (now.getTime() - date.getTime()) / MS_MONTH;
}

/** True when the newest review is old enough that the score may not describe
 *  the business as it is today. */
export function isStale(lastReviewedAt: Date | null, now = new Date()): boolean {
  if (!lastReviewedAt) return false;
  return monthsSince(lastReviewedAt, now) >= STALE_MONTHS;
}
