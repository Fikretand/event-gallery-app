import { describe, expect, it } from "vitest";

import { purposeFromObjectKey, settingsForPurpose, videoMessagesEnabled } from "@/lib/video-messages";

const settings = {
  event_id: "ev",
  allow_guest_upload: true,
  allow_guest_video: false,
  require_pin_for_upload: false,
  require_pin_for_gallery: false,
  max_guest_upload_mb: 250,
  gallery_visibility: "private" as const,
};

describe("video messages", () => {
  it("reads the purpose from the signed key only", () => {
    expect(purposeFromObjectKey("events/ev/guest/messages/a.mp4")).toBe("message");
    expect(purposeFromObjectKey("events/ev/guest/2026-10/a.mp4")).toBe("media");
    expect(purposeFromObjectKey("events/ev/photographer/originals/messages/a.mp4")).toBe("media");
    expect(purposeFromObjectKey("x/events/ev/guest/messages/a.mp4")).toBe("media");
  });

  it("accepts video for a message even when guest video is off", () => {
    expect(settingsForPurpose(settings, "message")?.allow_guest_video).toBe(true);
    expect(settingsForPurpose(settings, "media")?.allow_guest_video).toBe(false);
  });

  it("is on by default and off with guest uploads or the switch", () => {
    expect(videoMessagesEnabled(settings)).toBe(true);
    expect(videoMessagesEnabled({ ...settings, allow_video_messages: false })).toBe(false);
    expect(videoMessagesEnabled({ ...settings, allow_guest_upload: false })).toBe(false);
    expect(videoMessagesEnabled(null)).toBe(false);
  });
});
