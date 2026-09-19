import { describe, expect, it } from "vitest";

import { polarSecretCandidates } from "@/lib/billing";

/**
 * Polar's dashboard shows the webhook signing secret as `whsec_<base64>`.
 * Whether it signs with the prefix or with the bare value produces different
 * HMAC keys, and picking the wrong one rejects every delivery, so the webhook
 * route tries both rather than betting on one.
 */
describe("polarSecretCandidates", () => {
  const BARE = "zGzQX/wd46m6uaQwjcZfCM8iX4gdnbDGd/qPB73PNkI=";

  it("tries the bare secret first when the configured value carries the prefix", () => {
    expect(polarSecretCandidates(`whsec_${BARE}`)).toEqual([BARE, `whsec_${BARE}`]);
  });

  it("tries the prefixed form too when the configured value is already bare", () => {
    expect(polarSecretCandidates(BARE)).toEqual([BARE, `whsec_${BARE}`]);
  });

  it("always offers both forms, and never the same one twice", () => {
    for (const input of [BARE, `whsec_${BARE}`]) {
      const candidates = polarSecretCandidates(input);
      expect(candidates).toHaveLength(2);
      expect(new Set(candidates).size).toBe(2);
    }
  });

  it("does not strip a prefix that only looks similar", () => {
    expect(polarSecretCandidates("whsec2_abc")[0]).toBe("whsec2_abc");
  });
});
