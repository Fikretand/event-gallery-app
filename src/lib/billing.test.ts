import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { polarWebhookKeys } from "@/lib/billing";

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
