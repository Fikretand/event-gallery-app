import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { getDictionary, locales, primaryLocale } from "@/lib/i18n/index";

/**
 * The sitemap is an invitation to crawl. Anything listed here is something we
 * are actively asking a search engine to fetch, so the one thing it must never
 * contain is a route that holds somebody's photographs.
 */
describe("sitemap", () => {
  const entries = sitemap();
  const paths = entries.map((e) => new URL(e.url).pathname);

  it("never invites a crawler into a private route", () => {
    for (const path of paths) {
      // Scoped to path segments: the deployment's own hostname contains the
      // word "gallery", so matching the whole URL would be meaningless.
      expect(path).not.toMatch(/\/(gallery|upload|dashboard|admin|api|auth)(\/|$)/);
    }
  });

  it("lists every page in every language", () => {
    const perLocale = locales.map((l) => paths.filter((p) => p.startsWith(`/${l}`)).length);
    expect(new Set(perLocale).size).toBe(1);
    expect(perLocale[0]).toBeGreaterThan(0);
  });

  it("covers every event type that has a route", () => {
    // Routes and sitemap are generated from the same list; this asserts they
    // have not drifted apart.
    for (const type of getDictionary(primaryLocale).content.eventTypes) {
      for (const locale of locales) {
        expect(paths).toContain(`/${locale}/dogadjaji/${type.slug}`);
      }
    }
  });

  it("gives every entry the same set of language alternates", () => {
    for (const entry of entries) {
      const languages = entry.alternates?.languages ?? {};
      expect(Object.keys(languages).sort()).toEqual([...locales, "x-default"].sort());
    }
  });

  it("points x-default at the market language", () => {
    for (const entry of entries) {
      const xDefault = String(entry.alternates?.languages?.["x-default"]);
      expect(new URL(xDefault).pathname.startsWith(`/${primaryLocale}`)).toBe(true);
    }
  });

  it("uses ASCII slugs a Bosnian keyboard need not fight", () => {
    for (const path of paths) {
      expect(path).toMatch(/^[a-z0-9/-]*$/);
    }
  });

  it("has no duplicate URLs", () => {
    expect(new Set(paths).size).toBe(paths.length);
  });
});
