import { beforeEach, describe, expect, it, vi } from "vitest";

// The route's collaborators, replaced so the test sees exactly what it records.
const mocks = vi.hoisted(() => ({
  findMediaByStorageKey: vi.fn(),
  getEventSettingsById: vi.fn(),
  processMediaById: vi.fn(),
  recordCompletedUpload: vi.fn(),
  headStoredObject: vi.fn(),
  deleteStoredObject: vi.fn(),
}));

vi.mock("@/lib/events", () => ({
  findMediaByStorageKey: mocks.findMediaByStorageKey,
  getEventSettingsById: mocks.getEventSettingsById,
  processMediaById: mocks.processMediaById,
  recordCompletedUpload: mocks.recordCompletedUpload,
}));
vi.mock("@/lib/storage", () => ({
  headStoredObject: mocks.headStoredObject,
  deleteStoredObject: mocks.deleteStoredObject,
}));
vi.mock("@/lib/security", () => ({ verifyUploadConfirmToken: () => true }));

import { POST } from "@/app/api/uploads/confirm/route";

const KEY = "events/ev-1/guest/2026-10/abc.jpg";
const settings = {
  event_id: "ev-1",
  allow_guest_upload: true,
  allow_guest_video: false,
  require_pin_for_upload: false,
  require_pin_for_gallery: false,
  max_guest_upload_mb: 5,
  gallery_visibility: "private",
};

function confirm(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/uploads/confirm", {
      method: "POST",
      body: JSON.stringify({ objectKey: KEY, confirmToken: "t", originalFilename: "a.jpg", ...body }),
    }),
  );
}

describe("POST /api/uploads/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMediaByStorageKey.mockResolvedValue(null);
    mocks.getEventSettingsById.mockResolvedValue(settings);
    mocks.recordCompletedUpload.mockResolvedValue({ id: "m-1" });
    mocks.processMediaById.mockResolvedValue(undefined);
    mocks.deleteStoredObject.mockResolvedValue(undefined);
  });

  it("records the size and type R2 holds, not the ones claimed", async () => {
    // Audit 3.6: a 2 MB photo confirmed as 9e18 bytes of video.
    mocks.headStoredObject.mockResolvedValue({ size: 2_000_000, contentType: "image/jpeg" });
    const response = await confirm({ sizeBytes: 9e18, mimeType: "video/mp4" });

    expect(response.status).toBe(200);
    expect(mocks.recordCompletedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ sizeBytes: 2_000_000, mimeType: "image/jpeg", eventId: "ev-1", sourceType: "guest", purpose: "media" }),
    );
  });

  it("refuses and removes an object larger than the event allows", async () => {
    mocks.headStoredObject.mockResolvedValue({ size: 50 * 1024 * 1024, contentType: "image/jpeg" });
    const response = await confirm({ sizeBytes: 1000, mimeType: "image/jpeg" });

    expect(response.status).toBe(413);
    expect(mocks.deleteStoredObject).toHaveBeenCalledWith(KEY);
    expect(mocks.recordCompletedUpload).not.toHaveBeenCalled();
  });

  it("refuses a type the event does not accept", async () => {
    mocks.headStoredObject.mockResolvedValue({ size: 1000, contentType: "video/mp4" });
    const response = await confirm({});

    expect(response.status).toBe(415);
    expect(mocks.recordCompletedUpload).not.toHaveBeenCalled();
  });

  it("answers 409 while the object is not there yet", async () => {
    mocks.headStoredObject.mockResolvedValue(null);
    expect((await confirm({})).status).toBe(409);
    expect(mocks.recordCompletedUpload).not.toHaveBeenCalled();
  });

  it("records a video message under its own key even when guest video is off", async () => {
    mocks.headStoredObject.mockResolvedValue({ size: 5_000_000, contentType: "video/mp4" });
    const response = await confirm({ objectKey: "events/ev-1/guest/messages/m.mp4" });

    expect(response.status).toBe(200);
    expect(mocks.recordCompletedUpload).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: "message", mimeType: "video/mp4", sourceType: "guest" }),
    );
  });

  it("refuses a photo stored under a message key", async () => {
    mocks.headStoredObject.mockResolvedValue({ size: 1000, contentType: "image/jpeg" });
    const response = await confirm({ objectKey: "events/ev-1/guest/messages/m.jpg" });
    expect(response.status).toBe(415);
  });

  it("returns the existing row for a repeated confirm without a second record", async () => {
    mocks.findMediaByStorageKey.mockResolvedValue({ id: "m-old" });
    const response = await confirm({});

    expect(await response.json()).toEqual({ mediaId: "m-old" });
    expect(mocks.headStoredObject).not.toHaveBeenCalled();
    expect(mocks.recordCompletedUpload).not.toHaveBeenCalled();
  });
});
