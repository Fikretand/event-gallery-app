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
const PRIVATE_PATHS = [
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
];

/**
 * AI assistants and their crawlers, named so that being found by them is a
 * decision written down here rather than an accident of the `*` rule: the
 * search crawlers behind ChatGPT, Claude and Perplexity, the training
 * crawlers of OpenAI and Anthropic, and Google's AI token (Gemini). They get
 * exactly what every other crawler gets: the marketing pages, never a
 * gallery, an upload page or a dashboard.
 */
const AI_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_AGENTS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
