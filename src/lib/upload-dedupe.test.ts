import { describe, expect, it } from "vitest";

import {
  fileFingerprint,
  readSentFingerprints,
  rememberSentFingerprints,
  SENT_FINGERPRINT_LIMIT,
  sentStorageKey,
  splitAlreadySent,
} from "@/lib/upload-dedupe";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

const photo = (name: string, size = 100, lastModified = 1) => ({ name, size, lastModified });

describe("upload dedupe", () => {
  it("skips files this device already sent to the same event", () => {
    const storage = memoryStorage();
    rememberSentFingerprints("ev", [fileFingerprint(photo("a.jpg"))], storage);

    const { fresh, duplicates } = splitAlreadySent([photo("a.jpg"), photo("b.jpg")], readSentFingerprints("ev", storage));
    expect(fresh.map((f) => f.name)).toEqual(["b.jpg"]);
    expect(duplicates.map((f) => f.name)).toEqual(["a.jpg"]);
  });

  it("treats a different size or time as a different photo", () => {
    const sent = new Set([fileFingerprint(photo("a.jpg", 100, 1))]);
    expect(splitAlreadySent([photo("a.jpg", 101, 1), photo("a.jpg", 100, 2)], sent).duplicates).toEqual([]);
  });

  it("keeps events apart", () => {
    const storage = memoryStorage();
    rememberSentFingerprints("one", [fileFingerprint(photo("a.jpg"))], storage);
    expect(readSentFingerprints("two", storage).size).toBe(0);
  });

  it("keeps only the newest fingerprints", () => {
    const storage = memoryStorage();
    const many = Array.from({ length: SENT_FINGERPRINT_LIMIT + 5 }, (_, i) => `f${i}`);
    rememberSentFingerprints("ev", many, storage);
    const kept = readSentFingerprints("ev", storage);
    expect(kept.size).toBe(SENT_FINGERPRINT_LIMIT);
    expect(kept.has("f0")).toBe(false);
    expect(kept.has(`f${SENT_FINGERPRINT_LIMIT + 4}`)).toBe(true);
  });

  it("survives broken or missing storage", () => {
    const storage = memoryStorage();
    storage.data.set(sentStorageKey("ev"), "{not json");
    expect(readSentFingerprints("ev", storage).size).toBe(0);
    expect(readSentFingerprints("ev", null).size).toBe(0);

    const throwing = { getItem: () => null, setItem: () => { throw new Error("quota"); } };
    expect(() => rememberSentFingerprints("ev", ["x"], throwing)).not.toThrow();
  });
});
