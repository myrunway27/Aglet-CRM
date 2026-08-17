// Searchable attributes shown as filter chips and on business pages.
// Stored on Business.tags as a comma-wrapped slug list (",kosher,vegan,")
// so a single LIKE on ",slug," matches exactly one tag.
export const TAGS = [
  { slug: "kosher", label: "Kosher", food: true },
  { slug: "halal", label: "Halal", food: true },
  { slug: "vegan", label: "Vegan", food: true },
  { slug: "vegetarian", label: "Vegetarian", food: true },
  { slug: "gluten-free", label: "Gluten-free", food: true },
  { slug: "dairy-free", label: "Dairy-free", food: true },
  { slug: "organic", label: "Organic", food: true },
  { slug: "outdoor-seating", label: "Outdoor seating", food: true },
  { slug: "delivery", label: "Delivery", food: true },
  { slug: "takeout", label: "Takeout", food: true },
  { slug: "fine-dining", label: "Fine dining", food: true },
  { slug: "kid-friendly", label: "Kid-friendly", food: false },
  { slug: "pet-friendly", label: "Pet-friendly", food: false },
  { slug: "wheelchair-accessible", label: "Wheelchair accessible", food: false },
  { slug: "open-late", label: "Open late", food: false },
  { slug: "budget-friendly", label: "Budget-friendly", food: false },
  { slug: "free-wifi", label: "Free wifi", food: false },
  { slug: "parking", label: "Parking", food: false },
] as const;

export const FOOD_TAGS = TAGS.filter((t) => t.food);
export const GENERAL_TAGS = TAGS.filter((t) => !t.food);

export type TagSlug = (typeof TAGS)[number]["slug"];

const LABELS = new Map<string, string>(TAGS.map((t) => [t.slug, t.label]));
const VALID = new Set<string>(TAGS.map((t) => t.slug));

export function isTagSlug(value: string): value is TagSlug {
  return VALID.has(value);
}

export function tagLabel(slug: string): string {
  return LABELS.get(slug) ?? slug;
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
