import { describe, expect, it } from "vitest";

import { locales } from "@/lib/i18n/index";
import { localePath, privateMetadata, publicMetadata } from "@/lib/seo";

/**
 * The site publishes every marketing page twice, once per language. Getting
 * the canonical or the alternates wrong makes those two copies compete with
 * each other in search results instead of reinforcing one another.
 */
describe("publicMetadata", () => {
  const meta = publicMetadata({
    locale: "bs",
    path: "/pricing",
    title: "Cijene",
    description: "Opis.",
  });

  it("points the canonical at this language's copy, not the other one", () => {
    expect(String(meta.alternates?.canonical)).toMatch(/\/bs\/pricing$/);
  });

  it("lists every language, each at its own URL", () => {
    const languages = meta.alternates?.languages ?? {};
    for (const locale of locales) {
      expect(String(languages[locale])).toMatch(new RegExp(`/${locale}/pricing$`));
    }
  });

  it("sends x-default to English rather than to the bare root", () => {
    // `/` only redirects by Accept-Language, which is a poor canonical target.
    const languages = meta.alternates?.languages ?? {};
    expect(String(languages["x-default"])).toMatch(/\/en\/pricing$/);
  });

  it("declares the page's own locale and the others as alternates", () => {
    expect(meta.openGraph).toMatchObject({ locale: "bs_BA" });
    expect((meta.openGraph as { alternateLocale?: string[] }).alternateLocale).toContain("en_US");
  });

  it("gives the home page a locale root, not a trailing slash", () => {
    const home = publicMetadata({ locale: "en", path: "/", title: "T", description: "D" });
    expect(String(home.alternates?.canonical)).toMatch(/\/en$/);
  });

  it("builds absolute URLs, which Open Graph requires", () => {
    expect(String(meta.openGraph?.url)).toMatch(/^https?:\/\//);
  });
});

describe("localePath", () => {
  it("prefixes every language, including the default one", () => {
    // Marketing pages live only under /[locale]; "/" merely redirects.
    expect(localePath("en", "/pricing")).toBe("/en/pricing");
    expect(localePath("bs", "/pricing")).toBe("/bs/pricing");
    expect(localePath("en", "/")).toBe("/en");
  });
});

describe("privateMetadata", () => {
  it("keeps private pages out of results, snippets and image search", () => {
    const meta = privateMetadata();
    expect(meta.robots).toMatchObject({
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    });
  });

  it("never carries a canonical that would invite indexing", () => {
    expect(privateMetadata("Gallery").alternates).toBeUndefined();
  });
});
