export const CATEGORIES = [
  "Restaurants & Cafes",
  "Shops & Retail",
  "Health & Medical",
  "Beauty & Spa",
  "Home Services",
  "Auto Services",
  "Professional Services",
  "Education",
  "Fitness & Sports",
  "Entertainment",
  "Travel & Hotels",
  "Other",
] as const;

// Dietary and food-specific filters are only meaningful for these. A garage
// has no business being asked whether it's cholov yisroel.
export const FOOD_CATEGORIES: readonly string[] = ["Restaurants & Cafes"];

export function isFoodCategory(category: string | undefined | null): boolean {
  return !!category && FOOD_CATEGORIES.includes(category);
}
