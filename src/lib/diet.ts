// Dietary requirements as the communities themselves draw them, not as a
// flat checkbox. A generic "kosher" tag is close to useless to someone who
// keeps cholov yisroel; a generic "halal" tag is useless to someone who
// requires hand-slaughtered meat. Each standard belongs to a parent tag from
// src/lib/tags.ts, so coarse filtering still works.

export type DietStandard = {
  slug: string;
  label: string;
  parent: string;
  // Shown under the label on the business page and in the picker
  hint?: string;
};

export const DIET_STANDARDS: DietStandard[] = [
  // Kosher
  { slug: "glatt", label: "Glatt", parent: "kosher", hint: "Stricter standard for meat" },
  { slug: "cholov-yisroel", label: "Cholov Yisroel", parent: "kosher", hint: "Dairy under Jewish supervision" },
  { slug: "pas-yisroel", label: "Pas Yisroel", parent: "kosher", hint: "Bread baked under Jewish supervision" },
  { slug: "meat", label: "Meat (fleishig)", parent: "kosher" },
  { slug: "dairy", label: "Dairy (milchig)", parent: "kosher" },
  { slug: "pareve", label: "Pareve", parent: "kosher" },
  { slug: "kosher-for-passover", label: "Kosher for Passover", parent: "kosher" },
  { slug: "shabbat-friendly", label: "Closed Shabbat", parent: "kosher" },

  // Halal
  { slug: "hand-slaughtered", label: "Hand-slaughtered", parent: "halal", hint: "Zabiha by hand" },
  { slug: "no-alcohol-served", label: "No alcohol served", parent: "halal" },
  { slug: "prayer-space", label: "Prayer space available", parent: "halal" },

  // Gluten
  { slug: "celiac-safe", label: "Coeliac-safe kitchen", parent: "gluten-free", hint: "Dedicated prep area or fryer" },
  { slug: "dedicated-fryer", label: "Dedicated fryer", parent: "gluten-free" },

  // Plant-based
  { slug: "fully-vegan", label: "Fully vegan menu", parent: "vegan" },
  { slug: "vegan-options-3plus", label: "3+ vegan dishes", parent: "vegan", hint: "Not a fully vegan kitchen" },
  { slug: "no-cross-contamination", label: "Separate vegan prep", parent: "vegan" },
];

// Certifying agencies, shown next to a kosher/halal claim. Free text is
// allowed too — this list is only for the picker.
export const CERTIFIERS = [
  "OU", "OK", "Star-K", "Kof-K", "cRc", "CHK", "Badatz", "Local Vaad",
  "IFANCA", "HFSAA", "HMA", "Other",
];

const BY_SLUG = new Map(DIET_STANDARDS.map((s) => [s.slug, s] as const));
const VALID = new Set(DIET_STANDARDS.map((s) => s.slug));

export function isStandard(slug: string): boolean {
  return VALID.has(slug);
}

export function standardLabel(slug: string): string {
  return BY_SLUG.get(slug)?.label ?? slug;
}

export function standardParent(slug: string): string | undefined {
  return BY_SLUG.get(slug)?.parent;
}

export function standardsFor(parentTag: string): DietStandard[] {
  return DIET_STANDARDS.filter((s) => s.parent === parentTag);
}

export function parseStandards(stored: string): string[] {
  return stored.split(",").filter(isStandard);
}

export function storeStandards(slugs: string[]): string {
  const clean = [...new Set(slugs.filter(isStandard))];
  return clean.length ? `,${clean.join(",")},` : "";
}

// How stale a dietary claim is allowed to get before we visibly doubt it.
export const CONFIRM_FRESH_DAYS = 120;
export const CONFIRM_STALE_DAYS = 270;

export type Freshness = "fresh" | "aging" | "stale" | "unconfirmed";

export function freshnessOf(lastConfirmed: Date | null, now = new Date()): Freshness {
  if (!lastConfirmed) return "unconfirmed";
  const days = (now.getTime() - lastConfirmed.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= CONFIRM_FRESH_DAYS) return "fresh";
  if (days <= CONFIRM_STALE_DAYS) return "aging";
  return "stale";
}

export function freshnessLabel(f: Freshness, lastConfirmed: Date | null): string {
  if (f === "unconfirmed" || !lastConfirmed) return "not yet confirmed";
  const days = Math.floor((Date.now() - lastConfirmed.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return "confirmed today";
  if (days < 30) return `confirmed ${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `confirmed ${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `confirmed ${years} year${years === 1 ? "" : "s"} ago`;
}
