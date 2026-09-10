import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/stripe";

// Crawl the public site; keep account, admin and owner tooling out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/owner", "/notifications", "/api/", "/login", "/signup", "/verify"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
