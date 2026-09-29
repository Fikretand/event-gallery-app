import { describe, expect, it } from "vitest";

import { applyCustomCopy, COPY_FIELDS, customTitle, defaultCopy, sanitizeCustomCopy } from "./custom-copy";
import { getDictionary } from "./i18n/index";

describe("COPY_FIELDS", () => {
  it("points every field at a real, non-empty string in both languages", () => {
    for (const locale of ["en", "bs"] as const) {
      const dict = getDictionary(locale);
      for (const field of COPY_FIELDS) {
        expect(defaultCopy(dict, field.key, "Title"), `${locale}: ${field.key}`).not.toBe("");
      }
    }
  });

  it("never lists a templated string, which a custom text would silently break", () => {
    const dict = getDictionary("en");
    for (const field of COPY_FIELDS) {
      expect(defaultCopy(dict, field.key, "Title"), field.key).not.toMatch(/\{\{/);
    }
  });

  it("has no duplicate keys", () => {
    const keys = COPY_FIELDS.map((field) => field.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("sanitizeCustomCopy", () => {
  it("keeps only known keys with text", () => {
    expect(
      sanitizeCustomCopy({
        "gallery.browseCurated": "  Hvala!  ",
        "gallery.clientGallery": "   ",
        "auth.loginTitle": "not a gallery text",
        "gallery.__proto__": "x",
        "upload.badge": 42,
      }),
    ).toEqual({ "gallery.browseCurated": "Hvala!" });
  });

  it("rejects anything that is not a plain object", () => {
    expect(sanitizeCustomCopy(null)).toEqual({});
    expect(sanitizeCustomCopy("text")).toEqual({});
    expect(sanitizeCustomCopy(["a"])).toEqual({});
  });

  it("caps length and folds newlines in one-line fields", () => {
    const long = "a".repeat(1000);
    expect(sanitizeCustomCopy({ "upload.badge": long })["upload.badge"]).toHaveLength(80);
    expect(sanitizeCustomCopy({ "upload.badge": "Dobro\ndošli" })["upload.badge"]).toBe("Dobro došli");
  });

  it("keeps paragraphs in multi-line fields but not a wall of blank lines", () => {
    expect(sanitizeCustomCopy({ "gallery.browseCurated": "Prvi\r\n\n\n\n\nDrugi" })["gallery.browseCurated"]).toBe(
      "Prvi\n\nDrugi",
    );
  });

  it("strips invisible control characters", () => {
    expect(sanitizeCustomCopy({ "upload.badge": "Go\u0000sti\u0007" })["upload.badge"]).toBe("Gosti");
  });
});

describe("applyCustomCopy", () => {
  it("overrides only what the owner wrote and leaves the rest standard", () => {
    const dict = getDictionary("bs");
    const out = applyCustomCopy(dict, { "gallery.browseCurated": "Naš dan.", "uploadDropzone.sendBtn": "Šalji" });
    expect(out.gallery.browseCurated).toBe("Naš dan.");
    expect(out.gallery.clientGallery).toBe(dict.gallery.clientGallery);
    expect(out.uploadDropzone.sendBtn).toBe("Šalji");
    expect(out.upload).toBe(dict.upload);
  });

  it("does not mutate the shared dictionary", () => {
    const dict = getDictionary("en");
    const before = dict.gallery.browseCurated;
    applyCustomCopy(dict, { "gallery.browseCurated": "Changed" });
    expect(getDictionary("en").gallery.browseCurated).toBe(before);
  });

  it("ignores the title keys, which are not dictionary text", () => {
    const dict = getDictionary("en");
    expect(applyCustomCopy(dict, { "event.galleryTitle": "X" })).toEqual(dict);
  });
});

describe("customTitle", () => {
  it("falls back to the event title", () => {
    expect(customTitle({}, "event.galleryTitle", "Vjenčanje")).toBe("Vjenčanje");
    expect(customTitle({ "event.galleryTitle": "Amra & Tarik" }, "event.galleryTitle", "Vjenčanje")).toBe("Amra & Tarik");
  });
});

describe("editor labels", () => {
  it("label every field in both languages, and nothing else", () => {
    for (const locale of ["en", "bs"] as const) {
      const labels = getDictionary(locale).dashboard.event.copyEditor.fields;
      expect(Object.keys(labels).sort(), locale).toEqual(COPY_FIELDS.map((field) => field.key).sort());
    }
  });
});
