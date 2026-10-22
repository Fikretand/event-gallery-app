import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { billingEventDecision, planFitsAccount, polarWebhookKeys } from "@/lib/billing";

/**
 * Polar's dashboard shows the webhook signing secret as `whsec_<base64>`, and
 * three different conventions exist for turning that into an HMAC key. Picking
 * the wrong one rejects every delivery, so the route tries all of them. These
 * tests pin that set: signing the way any one convention would must be
 * verifiable, and nothing else may be.
 */
describe("polarWebhookKeys", () => {
  const BARE = "zGzQX/wd46m6uaQwjcZfCM8iX4gdnbDGd/qPB73PNkI=";
  const SECRET = `whsec_${BARE}`;

  const body = JSON.stringify({ type: "order.paid" });
  const id = "msg_1";
  const timestamp = "1789849127";

  /** Standard Webhooks: base64 of HMAC-SHA256 over `${id}.${ts}.${body}`. */
  const signWith = (key: Buffer) =>
    createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");

  const verifies = (secret: string, signature: string) =>
    polarWebhookKeys(secret).some(({ key }) => signWith(key) === signature);

  it("covers the SDK convention — the raw bytes of the displayed string", () => {
    expect(verifies(SECRET, signWith(Buffer.from(SECRET, "utf8")))).toBe(true);
  });

  it("covers the same string with the whsec_ prefix stripped", () => {
    expect(verifies(SECRET, signWith(Buffer.from(BARE, "utf8")))).toBe(true);
  });

  it("covers the Standard Webhooks convention — base64-decoded key bytes", () => {
    expect(verifies(SECRET, signWith(Buffer.from(BARE, "base64")))).toBe(true);
  });

  it("works the same when the secret is configured without the prefix", () => {
    for (const key of [Buffer.from(SECRET, "utf8"), Buffer.from(BARE, "utf8"), Buffer.from(BARE, "base64")]) {
      expect(verifies(BARE, signWith(key))).toBe(true);
    }
  });

  it("rejects a signature made with a different secret", () => {
    const attacker = signWith(Buffer.from("whsec_not-the-real-secret", "utf8"));
    expect(verifies(SECRET, attacker)).toBe(false);
  });

  it("labels each derivation and never yields an empty key", () => {
    for (const secret of [SECRET, BARE]) {
      const keys = polarWebhookKeys(secret);
      expect(keys.map((k) => k.label)).toEqual(["utf8(prefixed)", "utf8(bare)", "base64(bare)"]);
      expect(keys.every((k) => k.key.length > 0)).toBe(true);
    }
  });
});

describe("planFitsAccount", () => {
  it("lets a couple hold only One Event", () => {
    expect(planFitsAccount("couple", "couple")).toBe(true);
    expect(planFitsAccount("solo", "couple")).toBe(false);
    expect(planFitsAccount("pro", "couple")).toBe(false);
  });

  it("lets a photographer hold only Solo or Pro", () => {
    expect(planFitsAccount("solo", "photographer")).toBe(true);
    expect(planFitsAccount("pro", "photographer")).toBe(true);
    // The audit finding: a 79 KM one-time order must not activate a photographer.
    expect(planFitsAccount("couple", "photographer")).toBe(false);
  });

  it("refuses an unknown product", () => {
    expect(planFitsAccount(null, "photographer")).toBe(false);
    expect(planFitsAccount(undefined, "couple")).toBe(false);
  });
});

describe("billingEventDecision", () => {
  const base = { status: "active", externalId: "sub_1", currentExternalId: "sub_1" };

  it("ignores a delivery older than the last one applied", () => {
    // Audit lead: revoked, then a retried older order.paid re-activated the account.
    expect(
      billingEventDecision({ ...base, eventAt: new Date("2026-10-01T10:00:00Z"), lastAppliedAt: "2026-10-02T10:00:00Z" }),
    ).toBe("stale");
  });

  it("applies the same moment again (order.created and order.paid share it)", () => {
    expect(
      billingEventDecision({ ...base, eventAt: new Date("2026-10-02T10:00:00Z"), lastAppliedAt: "2026-10-02T10:00:00Z" }),
    ).toBe("apply");
  });

  it("does not let a refund of an old purchase cancel the current one", () => {
    expect(
      billingEventDecision({
        eventAt: new Date("2026-10-03T00:00:00Z"),
        lastAppliedAt: "2026-10-02T00:00:00Z",
        status: "canceled",
        externalId: "order_old",
        currentExternalId: "sub_new",
      }),
    ).toBe("other_entitlement");
  });

  it("applies a new purchase and the first event an account ever gets", () => {
    expect(
      billingEventDecision({ eventAt: new Date(), lastAppliedAt: null, status: "active", externalId: "sub_2", currentExternalId: "sub_1" }),
    ).toBe("apply");
    expect(
      billingEventDecision({ eventAt: null, lastAppliedAt: undefined, status: "canceled", externalId: "x", currentExternalId: null }),
    ).toBe("apply");
  });
});
