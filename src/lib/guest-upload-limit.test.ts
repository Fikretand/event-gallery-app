import { describe, expect, it } from "vitest";

import { COUPLE_GUEST_UPLOAD_MB } from "./constants";
import { guestUploadLimitFor } from "./events";

describe("guestUploadLimitFor", () => {
  it("gives One Event hosts the fixed limit whatever the form sends", () => {
    expect(guestUploadLimitFor("couple", 10240)).toBe(COUPLE_GUEST_UPLOAD_MB);
    expect(guestUploadLimitFor("couple", 5)).toBe(COUPLE_GUEST_UPLOAD_MB);
    expect(guestUploadLimitFor("couple", Number.NaN)).toBe(COUPLE_GUEST_UPLOAD_MB);
  });

  it("keeps a photographer's choice within the allowed range", () => {
    expect(guestUploadLimitFor("photographer", 500)).toBe(500);
    expect(guestUploadLimitFor("photographer", 99999)).toBe(2048);
    expect(guestUploadLimitFor("photographer", 1)).toBe(10);
    expect(guestUploadLimitFor("photographer", Number.NaN)).toBe(250);
  });
});

import { guestUploadStartsHidden } from "./events";

describe("guestUploadStartsHidden", () => {
  it("shows guest photos at once unless the event asks for approval", () => {
    expect(guestUploadStartsHidden({ sourceType: "guest", purpose: "media" })).toBe(false);
    expect(guestUploadStartsHidden({ sourceType: "guest", purpose: "media", requireApproval: true })).toBe(true);
  });

  it("always holds a video message for the hosts", () => {
    expect(guestUploadStartsHidden({ sourceType: "guest", purpose: "message" })).toBe(true);
  });

  it("never hides the photographer's own uploads", () => {
    expect(guestUploadStartsHidden({ sourceType: "photographer", requireApproval: true })).toBe(false);
  });
});
