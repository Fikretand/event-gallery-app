import { describe, expect, it } from "vitest";

import { validateUploadFiles } from "@/lib/upload-validation";

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
