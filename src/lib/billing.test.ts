import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { billingEventDecision, planFitsAccount, verifyWhopSignature, whopMembershipStatus } from "@/lib/billing";

/**
 * Whop keys the HMAC on the literal bytes of the `ws_…` secret, prefix
 * included. Stripping the prefix or base64-decoding it (the Polar habits)
 * would reject every real delivery.
 */
describe("verifyWhopSignature", () => {
  const secret = "ws_0123456789abcdef0123456789abcdef";
  const id = "msg_1";
  const timestamp = "1789849127";
  const body = JSON.stringify({ type: "payment.succeeded" });
  const signWith = (key: Buffer) =>
    createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  const verify = (signatureHeader: string, payload = body) =>
    verifyWhopSignature({ secret, id, timestamp, body: payload, signatureHeader });

  it("accepts a signature keyed on the whole secret", () => {
    expect(verify(`v1,${signWith(Buffer.from(secret, "utf8"))}`)).toBe(true);
  });

  it("finds the match among several space-separated signatures", () => {
    expect(verify(`v1,bm90LWl0 v1,${signWith(Buffer.from(secret, "utf8"))}`)).toBe(true);
  });

  it("rejects a key with the prefix stripped, a changed body, and garbage", () => {
    expect(verify(`v1,${signWith(Buffer.from(secret.slice(3), "utf8"))}`)).toBe(false);
    expect(verify(`v1,${signWith(Buffer.from(secret, "utf8"))}`, `${body} `)).toBe(false);
    expect(verify("v1,")).toBe(false);
  });
});

describe("whopMembershipStatus", () => {
  it("keeps the access states and folds every ending into canceled", () => {
    expect(["active", "trialing", "past_due"].map(whopMembershipStatus)).toEqual(["active", "trialing", "past_due"]);
    expect(["canceled", "expired", "completed", "unresolved", null].map(whopMembershipStatus)).toEqual([
      "canceled",
      "canceled",
      "canceled",
      "canceled",
      "canceled",
    ]);
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
