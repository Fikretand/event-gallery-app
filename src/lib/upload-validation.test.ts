import { describe, expect, it } from "vitest";

import { checkStoredUpload, validateUploadFiles } from "@/lib/upload-validation";

describe("validateUploadFiles", () => {
  it("accepts a valid guest image upload", () => {
    const result = validateUploadFiles(
      [{ name: "photo.jpg", size: 1024, type: "image/jpeg" }],
      "guest",
      {
        event_id: "evt",
        allow_guest_upload: true,
        allow_guest_video: true,
        require_pin_for_upload: false,
        require_pin_for_gallery: true,
        max_guest_upload_mb: 5,
        gallery_visibility: "private",
      },
    );

    expect(result).toHaveLength(1);
  });

  it("rejects unsupported file extensions", () => {
    expect(() =>
      validateUploadFiles([{ name: "archive.zip", size: 10, type: "application/zip" }], "guest"),
    ).toThrow(/extension is not supported/i);
  });

  it("rejects guest video when the event disables it", () => {
    expect(() =>
      validateUploadFiles(
        [{ name: "clip.mp4", size: 1024, type: "video/mp4" }],
        "guest",
        {
          event_id: "evt",
          allow_guest_upload: true,
          allow_guest_video: false,
          require_pin_for_upload: false,
          require_pin_for_gallery: true,
          max_guest_upload_mb: 5,
          gallery_visibility: "private",
        },
      ),
    ).toThrow(/video uploads are disabled/i);
  });

  it("rejects too many files", () => {
    expect(() =>
      validateUploadFiles(
        Array.from({ length: 26 }, (_, index) => ({
          name: `photo-${index}.jpg`,
          size: 100,
          type: "image/jpeg",
        })),
        "guest",
      ),
    ).toThrow(/up to 25 files/i);
  });
});

describe("size claims", () => {
  it("rejects a size that is not a whole number", () => {
    for (const size of [Number.NaN, 1.5, Number.POSITIVE_INFINITY, "x" as unknown as number]) {
      expect(() => validateUploadFiles([{ name: "a.jpg", size, type: "image/jpeg" }], "guest")).toThrow(/size is invalid/i);
    }
  });
});

describe("checkStoredUpload", () => {
  const settings = {
    event_id: "evt",
    allow_guest_upload: true,
    allow_guest_video: false,
    require_pin_for_upload: false,
    require_pin_for_gallery: false,
    max_guest_upload_mb: 5,
    gallery_visibility: "private" as const,
  };

  it("accepts what the grant allowed", () => {
    expect(checkStoredUpload({ size: 2_000_000, contentType: "image/jpeg" }, "guest", settings)).toBe("ok");
  });

  it("judges the stored object, not the claim", () => {
    expect(checkStoredUpload({ size: 6 * 1024 * 1024, contentType: "image/jpeg" }, "guest", settings)).toBe("too_large");
    expect(checkStoredUpload({ size: 0, contentType: "image/jpeg" }, "guest", settings)).toBe("empty");
    expect(checkStoredUpload({ size: 10, contentType: "text/html" }, "guest", settings)).toBe("bad_type");
    // Guest video is off for this event, whatever the browser sent.
    expect(checkStoredUpload({ size: 10, contentType: "video/mp4" }, "guest", settings)).toBe("bad_type");
    expect(checkStoredUpload({ size: 10, contentType: "video/mp4" }, "photographer", settings)).toBe("ok");
  });
});
