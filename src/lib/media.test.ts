import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  buffer: Buffer.from("") as Buffer,
  put: [] as string[],
}));

vi.mock("@/lib/storage", () => ({
  createSignedDownloadUrl: async (key: string) => `https://signed.test/${key}`,
  createSignedUploadUrl: async (key: string) => `https://upload.test/${key}`,
  getStoredObjectBuffer: async () => storage.buffer,
  publicMediaUrl: () => null,
  putStoredObject: async (key: string) => {
    storage.put.push(key);
    return true;
  },
}));

import sharp from "sharp";

import { enrichMediaWithUrls, IMAGE_THUMBNAIL_MAX_BYTES, processMediaRecord } from "./media";
import type { MediaFileRecord } from "./types";

const EVENT = "11111111-2222-3333-4444-555555555555";

function media(overrides: Partial<MediaFileRecord>): MediaFileRecord {
  return {
    id: "m-1",
    event_id: EVENT,
    storage_key: `events/${EVENT}/guest/2026-10/a.jpg`,
    thumbnail_key: null,
    mime_type: "image/jpeg",
    original_filename: "a.jpg",
    ...overrides,
  } as MediaFileRecord;
}

beforeEach(() => {
  storage.put = [];
});

describe("processMediaRecord", () => {
  it("makes a thumbnail for a normal photo", async () => {
    storage.buffer = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#e27952" } }).jpeg().toBuffer();
    const result = await processMediaRecord(media({}));
    expect(result.status).toBe("ready");
    expect(result.width).toBe(40);
    expect(result.thumbnailKey).toBe(`events/${EVENT}/thumbs/m-1.jpg`);
    expect(storage.put).toEqual([`events/${EVENT}/thumbs/m-1.jpg`]);
  });

  it("does not read a very large image into memory", async () => {
    storage.buffer = Buffer.from("would be read");
    const result = await processMediaRecord(media({ size_bytes: IMAGE_THUMBNAIL_MAX_BYTES + 1 }));
    expect(result).toMatchObject({ status: "ready", thumbnailKey: null });
    expect(storage.put).toEqual([]);
  });

  it("keeps an undecodable HEIC as ready, without a thumbnail", async () => {
    storage.buffer = Buffer.from("not really a heic file");
    const result = await processMediaRecord(
      media({ mime_type: "image/heic", original_filename: "IMG_0001.HEIC", storage_key: `events/${EVENT}/guest/2026-10/b.heic` }),
    );
    expect(result).toMatchObject({ status: "ready", thumbnailKey: null, width: null });
    expect(storage.put).toEqual([]);
  });

  it("still fails a corrupt JPEG", async () => {
    storage.buffer = Buffer.from("garbage");
    await expect(processMediaRecord(media({}))).rejects.toThrow();
  });

  it("refuses a key outside the row's event", async () => {
    storage.buffer = Buffer.from("garbage");
    await expect(
      processMediaRecord(media({ storage_key: "events/99999999-8888-7777-6666-555555555555/guest/x.jpg" })),
    ).rejects.toThrow(/outside its event/);
  });
});

describe("enrichMediaWithUrls", () => {
  it("signs a row's own keys", async () => {
    const [item] = await enrichMediaWithUrls([media({ thumbnail_key: `events/${EVENT}/thumbs/m-1.jpg` })]);
    expect(item.previewUrl).toBe(`https://signed.test/events/${EVENT}/guest/2026-10/a.jpg`);
    expect(item.thumbnailUrl).toBe(`https://signed.test/events/${EVENT}/thumbs/m-1.jpg`);
  });

  it("signs nothing for a key pointing at another event", async () => {
    const [item] = await enrichMediaWithUrls([
      media({ storage_key: "events/99999999-8888-7777-6666-555555555555/guest/x.jpg" }),
    ]);
    expect(item.previewUrl).toBeNull();
    expect(item.thumbnailUrl).toBeNull();
  });
});
