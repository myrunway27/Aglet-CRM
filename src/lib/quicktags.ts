// One-tap chips offered right after the star rating. Most people won't write
// a paragraph but will happily tap three of these, so they're the main source
// of structured, filterable detail on a business.
export const QUICK_TAGS = [
  { slug: "huge-portions", label: "Huge portions", good: true },
  { slug: "worth-the-wait", label: "Worth the wait", good: true },
  { slug: "great-value", label: "Great value", good: true },
  { slug: "friendly-staff", label: "Friendly staff", good: true },
  { slug: "clean", label: "Spotless", good: true },
  { slug: "quiet", label: "Quiet enough to talk", good: true },
  { slug: "knew-the-diet", label: "Staff knew the diet", good: true },
  { slug: "loud", label: "Loud", good: false },
  { slug: "slow-service", label: "Slow service", good: false },
  { slug: "pricey", label: "Pricey", good: false },
  { slug: "small-portions", label: "Small portions", good: false },
  { slug: "long-wait", label: "Long wait", good: false },
  { slug: "hard-to-park", label: "Hard to park", good: false },
  { slug: "cramped", label: "Cramped", good: false },
] as const;

const VALID = new Set<string>(QUICK_TAGS.map((t) => t.slug));
const LABELS = new Map<string, string>(QUICK_TAGS.map((t) => [t.slug, t.label]));
const GOOD = new Map<string, boolean>(QUICK_TAGS.map((t) => [t.slug, t.good]));

export function parseQuickTags(stored: string): string[] {
  return stored.split(",").filter((s) => VALID.has(s));
}

export function storeQuickTags(slugs: string[]): string {
  const clean = [...new Set(slugs.filter((s) => VALID.has(s)))].slice(0, 5);
  return clean.length ? `,${clean.join(",")},` : "";
}

export function quickTagLabel(slug: string): string {
  return LABELS.get(slug) ?? slug;
}

export function quickTagIsGood(slug: string): boolean {
  return GOOD.get(slug) ?? true;
}
