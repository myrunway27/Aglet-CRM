import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteUrl } from "@/lib/stripe";
import { CATEGORIES } from "@/lib/categories";

export const dynamic = "force-dynamic";

// Every listing, every category, and the fixed pages. Reviewed places are
// marked as changing more often so crawlers come back to them first.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const businesses = await prisma.business.findMany({
    select: { slug: true, lastReviewedAt: true, createdAt: true, scoreCount: true },
    orderBy: { scoreCount: "desc" },
    take: 45000,
  });
  const fixed: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/map`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/trust`, changeFrequency: "weekly", priority: 0.4 },
    { url: `${base}/guidelines`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.1 },
    ...CATEGORIES.filter((c) => c !== "Other").map((c) => ({
      url: `${base}/?category=${encodeURIComponent(c)}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
  ];
  return [
    ...fixed,
    ...businesses.map((b) => ({
      url: `${base}/business/${b.slug}`,
      lastModified: b.lastReviewedAt ?? b.createdAt,
      changeFrequency: (b.scoreCount > 0 ? "weekly" : "monthly") as "weekly" | "monthly",
      priority: b.scoreCount > 0 ? 0.8 : 0.5,
    })),
  ];
}
