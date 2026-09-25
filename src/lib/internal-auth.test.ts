import { describe, expect, it } from "vitest";

import { isInternalRequest } from "@/lib/internal-auth";

const req = (headers: Record<string, string>) => new Request("https://example.com/api/internal/x", { headers });
const SECRETS = ["cron-secret-value", "worker-secret-value"];

describe("isInternalRequest", () => {
  it("accepts Vercel Cron's bearer token", () => {
    expect(isInternalRequest(req({ authorization: "Bearer cron-secret-value" }), SECRETS)).toBe(true);
  });

  it("accepts the worker secret in either header", () => {
    expect(isInternalRequest(req({ "x-worker-secret": "worker-secret-value" }), SECRETS)).toBe(true);
    expect(isInternalRequest(req({ "x-media-worker-secret": "worker-secret-value" }), SECRETS)).toBe(true);
  });

  it("refuses a wrong, partial, or missing secret", () => {
    expect(isInternalRequest(req({ authorization: "Bearer wrong" }), SECRETS)).toBe(false);
    expect(isInternalRequest(req({ authorization: "Bearer cron-secret-valu" }), SECRETS)).toBe(false);
    expect(isInternalRequest(req({ authorization: "cron-secret-value" }), SECRETS)).toBe(false);
    expect(isInternalRequest(req({}), SECRETS)).toBe(false);
  });

  it("authorises nothing when no secret is configured", () => {
    // An empty header must not match an empty secret.
    expect(isInternalRequest(req({ authorization: "Bearer " }), [undefined, ""])).toBe(false);
    expect(isInternalRequest(req({}), [undefined, undefined])).toBe(false);
  });
});
