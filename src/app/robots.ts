import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo";

/**
 * Crawling rules.
 *
 * Everything private is disallowed: dashboards and admin because they are
 * useless to a crawler, and `/gallery` and `/upload` because they hold real
 * people's photographs behind a link. Disallow alone would still let a linked
 * URL appear in results, so those pages also send `noindex` — see
 * `privateMetadata`.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/auth/",
          "/admin",
          "/dashboard",
          "/gallery/",
          "/upload/",
          "/en/admin",
          "/en/dashboard",
          "/en/gallery/",
          "/en/upload/",
          "/bs/admin",
          "/bs/dashboard",
          "/bs/gallery/",
          "/bs/upload/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
