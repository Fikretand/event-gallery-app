import { describe, expect, it } from "vitest";

import { isPartnerImageKey, offerStatus, safeOfferLink } from "./partners-shared";

const NOW = new Date("2026-11-07T12:00:00Z");
const ID = "0b9f6c2e-1111-4222-8333-944455556666";

describe("offerStatus", () => {
  it("is live inside its period and while switched on", () => {
    expect(offerStatus({ is_active: true, starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-12-01T00:00:00Z" }, NOW)).toBe("live");
    expect(offerStatus({ is_active: true, starts_at: "2026-11-01T00:00:00Z", ends_at: null }, NOW)).toBe("live");
  });

  it("waits for its start, ends at its end, and pauses when switched off", () => {
    expect(offerStatus({ is_active: true, starts_at: "2026-11-08T00:00:00Z", ends_at: null }, NOW)).toBe("scheduled");
    expect(offerStatus({ is_active: true, starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-07T12:00:00Z" }, NOW)).toBe("ended");
    expect(offerStatus({ is_active: false, starts_at: "2026-11-01T00:00:00Z", ends_at: null }, NOW)).toBe("paused");
  });
});

describe("isPartnerImageKey", () => {
  it("accepts only keys under the offer's own folder", () => {
    expect(isPartnerImageKey(`partners/${ID}/a.webp`, ID)).toBe(true);
    expect(isPartnerImageKey(`partners/other/a.webp`, ID)).toBe(false);
    expect(isPartnerImageKey(`events/${ID}/a.webp`, ID)).toBe(false);
    expect(isPartnerImageKey(`partners/${ID}/../x`, ID)).toBe(false);
    expect(isPartnerImageKey(null, ID)).toBe(false);
  });
});

describe("safeOfferLink", () => {
  it("keeps https links and refuses everything else", () => {
    expect(safeOfferLink("https://salon.ba/ponuda")).toBe("https://salon.ba/ponuda");
    expect(safeOfferLink("http://salon.ba")).toBeNull();
    expect(safeOfferLink("javascript:alert(1)")).toBeNull();
    expect(safeOfferLink("not a url")).toBeNull();
    expect(safeOfferLink("")).toBeNull();
  });
});
