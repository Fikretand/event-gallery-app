import { describe, expect, it } from "vitest";

import { isPendingGuestUpload } from "./live-slides";

const created = "2026-10-22T18:00:00.000Z";

describe("isPendingGuestUpload", () => {
  it("is true for a guest file hidden when it was recorded", () => {
    expect(isPendingGuestUpload({ source_type: "guest", created_at: created, hidden_at: "2026-10-22T18:00:00.400Z" })).toBe(true);
  });

  it("is false once approved", () => {
    expect(isPendingGuestUpload({ source_type: "guest", created_at: created, hidden_at: null })).toBe(false);
  });

  it("is false for a file the owner hid later on purpose", () => {
    expect(isPendingGuestUpload({ source_type: "guest", created_at: created, hidden_at: "2026-10-22T21:30:00.000Z" })).toBe(false);
  });

  it("is false for the photographer's own hidden files", () => {
    expect(isPendingGuestUpload({ source_type: "photographer", created_at: created, hidden_at: created })).toBe(false);
  });
});
