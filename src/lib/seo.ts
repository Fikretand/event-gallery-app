import type { Metadata } from "next";

import { env } from "@/lib/env";
import { locales, primaryLocale, type Locale } from "@/lib/i18n/index";

/**
 * Metadata helpers for the public marketing pages.
 *
 * The site serves the same pages twice — `/en/...` and `/bs/...` — which a
 * search engine reads as duplicate content unless every page states which one
 * it is and links to its counterpart. So each page gets a canonical URL and a
 * full set of `hreflang` alternates, including `x-default` pointing at the
 * language this product is primarily sold in.
 *
 * Anything private (dashboards, admin, guest upload pages, someone's gallery)
 * must use `privateMetadata` instead: those carry real people's photographs and
 * have no business in a search index.
 */

/** Absolute site origin, without a trailing slash. */
export function siteUrl(): string {
  return env.appUrl.replace(/\/$/, "");
}

/** `/en/pricing` — the path a locale's copy of a page lives at. */
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean}`;
}

/** BCP-47 tags for the Open Graph `locale` field. */
const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  bs: "bs_BA",
};

export const SITE_NAME = "Confetti";

/**
 * Canonical URL plus every language alternate for one marketing page.
 *
 * `x-default` is the Bosnian copy — this product sells in BiH — and never the
 * bare `/`, which only redirects by Accept-Language; a redirect makes a poor
 * canonical target.
 */
function alternatesFor(locale: Locale, path: string): Metadata["alternates"] {
  const base = siteUrl();
  const languages: Record<string, string> = {};
  for (const l of locales) {
    languages[l] = `${base}${localePath(l, path)}`;
  }
  languages["x-default"] = `${base}${localePath(primaryLocale, path)}`;

  return {
    canonical: `${base}${localePath(locale, path)}`,
    languages,
  };
}

/**
 * Metadata for a public, indexable page.
 *
 * `path` is the locale-free route ("/" , "/pricing", …) so the alternates can
 * be derived for every language from the same call.
 */
export function publicMetadata(opts: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = `${siteUrl()}${localePath(opts.locale, opts.path)}`;

  return {
    title: opts.title,
    description: opts.description,
    alternates: alternatesFor(opts.locale, opts.path),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
      url,
      locale: OG_LOCALE[opts.locale],
      alternateLocale: locales.filter((l) => l !== opts.locale).map((l) => OG_LOCALE[l]),
    },
    twitter: {
      card: "summary_large_image",
      title: opts.title,
      description: opts.description,
    },
  };
}

/**
 * Metadata for anything that must stay out of search results.
 *
 * `nocache` and the Google-specific directives are there because a private
 * gallery link that leaks into a crawl should not survive as a cached copy or
 * a text snippet either.
 */
export function privateMetadata(title?: string): Metadata {
  return {
    ...(title ? { title } : {}),
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
  };
}
