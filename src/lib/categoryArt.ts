// One stroke icon and one tint per category. Used for category tiles and as
// the cover of any business that has no photos yet — a branded placeholder
// beats a grey box, and beats fake stock imagery.

export type CategoryArt = { icon: string; tint: string; ink: string };

const ART: Record<string, CategoryArt> = {
  "Restaurants & Cafes": {
    tint: "#eaf0ff", ink: "#1d4ed8",
    icon: "M4 3v7a3 3 0 0 0 3 3v8M7 3v7M17 3c-1.5 0-3 1.5-3 5s1.5 5 3 5v8",
  },
  "Shops & Retail": {
    tint: "#eef2f7", ink: "#334155",
    icon: "M4 8h16l-1 12H5L4 8ZM8 8V6a4 4 0 0 1 8 0v2",
  },
  "Health & Medical": {
    tint: "#e6f6f4", ink: "#0f766e",
    icon: "M12 4v16M4 12h16",
  },
  "Beauty & Spa": {
    tint: "#f3eefe", ink: "#6d28d9",
    icon: "M12 21c-4-3-7-6-7-10a4 4 0 0 1 8 0 4 4 0 0 1 8 0c0 4-3 7-9 10Z",
  },
  "Home Services": {
    tint: "#eaf0ff", ink: "#1e40af",
    icon: "M3 11 12 4l9 7M5 10v10h14V10",
  },
  "Auto Services": {
    tint: "#eef2f7", ink: "#1f2937",
    icon: "M5 13l2-5h10l2 5M4 17h16v-4H4v4ZM7 17v2M17 17v2",
  },
  "Professional Services": {
    tint: "#e8f0fe", ink: "#1d4ed8",
    icon: "M4 8h16v12H4V8ZM9 8V6h6v2M4 13h16",
  },
  Education: {
    tint: "#e6f0ff", ink: "#1e3a8a",
    icon: "M2 9l10-5 10 5-10 5-10-5ZM6 11v5c0 1 3 3 6 3s6-2 6-3v-5",
  },
  "Fitness & Sports": {
    tint: "#e6f6f4", ink: "#115e59",
    icon: "M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12",
  },
  Entertainment: {
    tint: "#f3eefe", ink: "#5b21b6",
    icon: "M4 5h16v14H4V5ZM4 9h16M8 5v14M16 5v14",
  },
  "Travel & Hotels": {
    tint: "#e6f2fb", ink: "#0c4a6e",
    icon: "M3 18h18M5 18V9h14v9M9 9V6h6v3M9 13h2M13 13h2",
  },
  Other: {
    tint: "#f1f5f9", ink: "#475569",
    icon: "M12 5v14M5 12h14",
  },
};

export function categoryArt(category: string): CategoryArt {
  return ART[category] ?? ART.Other;
}

/** Short label for tiles — "Restaurants & Cafes" is too long for a chip. */
export function shortCategory(category: string): string {
  const map: Record<string, string> = {
    "Restaurants & Cafes": "Food & Drink",
    "Shops & Retail": "Shops",
    "Health & Medical": "Health",
    "Beauty & Spa": "Beauty",
    "Home Services": "Home",
    "Auto Services": "Auto",
    "Professional Services": "Services",
    "Fitness & Sports": "Fitness",
    "Travel & Hotels": "Travel",
  };
  return map[category] ?? category;
}
