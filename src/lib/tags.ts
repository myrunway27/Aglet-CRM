// Searchable attributes shown as filter chips and on business pages.
// Stored on Business.tags as a comma-wrapped slug list (",kosher,vegan,")
// so a single LIKE on ",slug," matches exactly one tag.
export const TAGS = [
  { slug: "kosher", label: "Kosher" },
  { slug: "halal", label: "Halal" },
  { slug: "vegan", label: "Vegan" },
  { slug: "vegetarian", label: "Vegetarian" },
  { slug: "gluten-free", label: "Gluten-free" },
  { slug: "dairy-free", label: "Dairy-free" },
  { slug: "organic", label: "Organic" },
  { slug: "kid-friendly", label: "Kid-friendly" },
  { slug: "pet-friendly", label: "Pet-friendly" },
  { slug: "wheelchair-accessible", label: "Wheelchair accessible" },
  { slug: "outdoor-seating", label: "Outdoor seating" },
  { slug: "delivery", label: "Delivery" },
  { slug: "takeout", label: "Takeout" },
  { slug: "open-late", label: "Open late" },
  { slug: "budget-friendly", label: "Budget-friendly" },
  { slug: "fine-dining", label: "Fine dining" },
  { slug: "free-wifi", label: "Free wifi" },
  { slug: "parking", label: "Parking" },
] as const;

export type TagSlug = (typeof TAGS)[number]["slug"];

const LABELS = new Map(TAGS.map((t) => [t.slug, t.label] as const));
const VALID = new Set<string>(TAGS.map((t) => t.slug));

export function isTagSlug(value: string): value is TagSlug {
  return VALID.has(value);
}

export function tagLabel(slug: string): string {
  return LABELS.get(slug as TagSlug) ?? slug;
}

// ",kosher,vegan," -> ["kosher", "vegan"]
export function parseTags(stored: string): string[] {
  return stored.split(",").filter(isTagSlug);
}

// ["kosher", "vegan"] -> ",kosher,vegan," ("" when empty)
export function storeTags(slugs: string[]): string {
  const clean = [...new Set(slugs.filter(isTagSlug))];
  return clean.length ? `,${clean.join(",")},` : "";
}
