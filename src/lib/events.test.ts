import { describe, expect, it } from "vitest";

import { computeTrialState, getCoupleAccessEndsAt, getCoupleUploadEndsAt, getEventLifecycleStatus, getPhotographerPlanLimits, isEventExpired, isGuestUploadWindowClosed, normalizePhotographerPlanTier, requiresGalleryPin } from "@/lib/events";
import type { EventRecord } from "@/lib/types";

const baseEvent: EventRecord = {
  id: "evt",
  owner_user_id: "usr",
  title: "Test",
  client_name: null,
  slug: "test",
  event_date: null,
  expires_at: null,
  upload_pin_hash: null,
  gallery_pin_hash: null,
  status: "active",
  cover_image_id: null,
  created_at: new Date().toISOString(),
  event_settings: null,
};

describe("isEventExpired", () => {
  it("returns false when expiry is unset", () => {
    expect(isEventExpired(baseEvent)).toBe(false);
  });

  it("returns true for past expiry", () => {
    expect(
      isEventExpired({
        ...baseEvent,
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      }),
    ).toBe(true);
  });
});

describe("getEventLifecycleStatus", () => {
  it("returns expired when the expiry date has passed", () => {
    expect(
      getEventLifecycleStatus({
        ...baseEvent,
        expires_at: new Date(Date.now() - 60_000).toISOString(),
      }),
    ).toBe("expired");
  });

  it("preserves archived status even if no expiry is set", () => {
    expect(
      getEventLifecycleStatus({
        ...baseEvent,
        status: "archived",
      }),
    ).toBe("archived");
  });
});

describe("requiresGalleryPin", () => {
  it("returns false when no gallery pin exists even if the setting is enabled", () => {
    expect(
      requiresGalleryPin({
        ...baseEvent,
        gallery_pin_hash: null,
        event_settings: {
          event_id: "evt",
          allow_guest_upload: true,
          allow_guest_video: true,
          require_pin_for_upload: false,
          require_pin_for_gallery: true,
          max_guest_upload_mb: 250,
          gallery_visibility: "private",
        },
      }),
    ).toBe(false);
  });

  it("returns true only when a gallery pin exists and protection is enabled", () => {
    expect(
      requiresGalleryPin({
        ...baseEvent,
        gallery_pin_hash: "hashed-pin",
        event_settings: {
          event_id: "evt",
          allow_guest_upload: true,
          allow_guest_video: true,
          require_pin_for_upload: false,
          require_pin_for_gallery: true,
          max_guest_upload_mb: 250,
          gallery_visibility: "private",
        },
      }),
    ).toBe(true);
  });
});

describe("couple plan windows", () => {
  it("caps guest uploads to 30 days from the event date when it exists", () => {
    expect(
      getCoupleUploadEndsAt({
        ...baseEvent,
        created_at: "2026-01-01T12:00:00.000Z",
        event_date: "2026-02-10",
        expires_at: "2026-04-01T12:00:00.000Z",
      }),
    ).toBe("2026-03-12T00:00:00.000Z");
  });

  it("uses the event expiry when it ends before the upload window", () => {
    expect(
      getCoupleUploadEndsAt({
        ...baseEvent,
        created_at: "2026-01-01T12:00:00.000Z",
        event_date: "2026-02-10",
        expires_at: "2026-02-20T12:00:00.000Z",
      }),
    ).toBe("2026-02-20T12:00:00.000Z");
  });

  it("calculates 90 days of gallery access from the event date when it exists", () => {
    expect(
      getCoupleAccessEndsAt({
        ...baseEvent,
        created_at: "2026-01-01T12:00:00.000Z",
        event_date: "2026-02-10",
      }),
    ).toBe("2026-05-11T00:00:00.000Z");
  });

  it("falls back to creation time when no event date exists", () => {
    expect(
      getCoupleAccessEndsAt({
        ...baseEvent,
        created_at: "2026-01-01T12:00:00.000Z",
        event_date: null,
      }),
    ).toBe("2026-04-01T12:00:00.000Z");
  });

  it("marks the guest upload window closed after the event-date window for couple events", () => {
    expect(
      isGuestUploadWindowClosed(
        {
          ...baseEvent,
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          event_date: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        "couple",
      ),
    ).toBe(true);
  });
});

describe("photographer plan limits", () => {
  it("defaults unknown plan tiers to solo", () => {
    expect(normalizePhotographerPlanTier("anything")).toBe("solo");
  });

  it("returns solo limits", () => {
    expect(getPhotographerPlanLimits("solo")).toMatchObject({
      activeEventLimit: 5,
    });
  });

  it("returns pro limits", () => {
    expect(getPhotographerPlanLimits("pro")).toMatchObject({
      activeEventLimit: 25,
    });
  });
});

/**
 * The trial is what stands between a free account and the product.
 *
 * Worth knowing when reading these: computeTrialState takes no account type at
 * all, and a couple carries role "photographer" in the database — so nothing
 * here can tell a couple from a photographer. That was the bug: the guest-upload
 * route decided on its own that couples skip the trial, which handed away the
 * whole One Event product (an unpaid couple could collect guest photos up to the
 * solo tier's storage ceiling, for ever). The gate belongs here, uniformly, and
 * paying is the only thing that lifts it.
 */
describe("computeTrialState", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

  it("lifts the trial once the account has paid", () => {
    // A couple who bought One Event: the webhook sets subscription_status.
    expect(computeTrialState(daysAgo(400), "solo", 5000, "photographer", "active").status).toBe("none");
    expect(computeTrialState(daysAgo(400), "solo", 5000, "photographer", "trialing").status).toBe("none");
  });

  it("lifts the trial for admins", () => {
    expect(computeTrialState(daysAgo(400), "solo", 5000, "admin", null).status).toBe("none");
  });

  it("expires an unpaid account once the days run out", () => {
    expect(computeTrialState(daysAgo(8), "solo", 0, "photographer", null).status).toBe("expired");
  });

  it("stays active inside the window and reports the photo ceiling", () => {
    const trial = computeTrialState(daysAgo(2), "solo", 3, "photographer", null);
    expect(trial.status).toBe("active");
    expect(trial.daysLeft).toBe(5);
    expect(trial.photosLimit).toBe(20);
  });

  it("does not let a refunded or lapsed subscription keep the trial lifted", () => {
    expect(computeTrialState(daysAgo(8), "solo", 0, "photographer", "canceled").status).toBe("expired");
  });
});
