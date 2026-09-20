import type { MetadataRoute } from "next";

import { locales, primaryLocale } from "@/lib/i18n/index";
import { localePath, siteUrl } from "@/lib/seo";

/**
 * The public pages, once per language, each declaring its counterparts.
 *
 * Only marketing routes belong here. Dashboards, galleries and guest upload
 * pages are private; listing them would invite exactly the crawl the robots
 * rules exist to prevent.
 */
const PUBLIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/for-photographers", priority: 0.8, changeFrequency: "monthly" },
  { path: "/for-couples", priority: 0.8, changeFrequency: "monthly" },
  { path: "/get-started", priority: 0.6, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  return PUBLIC_PATHS.flatMap(({ path, priority, changeFrequency }) => {
    const languages: Record<string, string> = {};
    for (const locale of locales) {
      languages[locale] = `${base}${localePath(locale, path)}`;
    }
    languages["x-default"] = `${base}${localePath(primaryLocale, path)}`;

    return locales.map((locale) => ({
      url: `${base}${localePath(locale, path)}`,
      lastModified,
      changeFrequency,
      priority,
      alternates: { languages },
    }));
  });
}
