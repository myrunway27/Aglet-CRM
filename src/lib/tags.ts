// Searchable attributes shown as filter chips and on business pages.
// Stored on Business.tags as a comma-wrapped slug list (",kosher,vegan,")
// so a single LIKE on ",slug," matches exactly one tag.
export const TAGS = [
  // Food and dietary — only offered once a food category is chosen.
  { slug: "kosher", label: "Kosher", food: true, group: "diet" },
  { slug: "halal", label: "Halal", food: true, group: "diet" },
  { slug: "vegan", label: "Vegan", food: true, group: "diet" },
  { slug: "vegetarian", label: "Vegetarian", food: true, group: "diet" },
  { slug: "gluten-free", label: "Gluten-free", food: true, group: "diet" },
  { slug: "dairy-free", label: "Dairy-free", food: true, group: "diet" },
  { slug: "organic", label: "Organic", food: true, group: "diet" },
  { slug: "outdoor-seating", label: "Outdoor seating", food: true, group: "amenity" },
  { slug: "delivery", label: "Delivery", food: true, group: "amenity" },
  { slug: "takeout", label: "Takeout", food: true, group: "amenity" },
  { slug: "reservations", label: "Takes reservations", food: true, group: "amenity" },
  { slug: "fine-dining", label: "Fine dining", food: true, group: "amenity" },

  // Amenities — useful for any kind of business.
  { slug: "kid-friendly", label: "Kid-friendly", food: false, group: "amenity" },
  { slug: "pet-friendly", label: "Pet-friendly", food: false, group: "amenity" },
  { slug: "open-late", label: "Open late", food: false, group: "amenity" },
  { slug: "budget-friendly", label: "Budget-friendly", food: false, group: "amenity" },
  { slug: "free-wifi", label: "Free wifi", food: false, group: "amenity" },
  { slug: "parking", label: "Parking", food: false, group: "amenity" },
  { slug: "appointment-only", label: "Appointment only", food: false, group: "amenity" },
  { slug: "walk-ins", label: "Walk-ins welcome", food: false, group: "amenity" },

  // Accessibility. Badly served across the whole category, and the thing a
  // wheelchair user most needs to know before setting out — so these get
  // their own group rather than being buried among the amenities.
  { slug: "wheelchair-accessible", label: "Wheelchair accessible", food: false, group: "access" },
  { slug: "step-free-entry", label: "Step-free entry", food: false, group: "access" },
  { slug: "accessible-bathroom", label: "Accessible bathroom", food: false, group: "access" },
  { slug: "accessible-parking", label: "Accessible parking", food: false, group: "access" },
  { slug: "hearing-loop", label: "Hearing loop", food: false, group: "access" },
  { slug: "braille-menu", label: "Braille / large print", food: false, group: "access" },
  { slug: "service-animals", label: "Service animals welcome", food: false, group: "access" },
  { slug: "quiet-space", label: "Quiet / low-sensory space", food: false, group: "access" },
] as const;

export const FOOD_TAGS = TAGS.filter((t) => t.food);
export const GENERAL_TAGS = TAGS.filter((t) => !t.food);
export const ACCESS_TAGS = TAGS.filter((t) => t.group === "access");
export const AMENITY_TAGS = TAGS.filter((t) => t.group === "amenity");
export const DIET_TAGS = TAGS.filter((t) => t.group === "diet");

export type TagGroup = (typeof TAGS)[number]["group"];

export function tagGroup(slug: string): TagGroup | null {
  return TAGS.find((t) => t.slug === slug)?.group ?? null;
}

export function isAccessTag(slug: string): boolean {
  return tagGroup(slug) === "access";
}

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
