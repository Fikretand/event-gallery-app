import { describe, expect, it } from "vitest";

import { formatEmailDate, renderLeadEmail, type LeadEmailInput } from "./lead-emails";

const base: LeadEmailInput = {
  locale: "bs",
  code: "CONF-ABCD-2345",
  priceBam: 69,
  fullPriceBam: 79,
  finalPriceBam: 64,
  expiresAt: "2026-12-17T09:00:00Z",
  daysLeft: 20,
  redeemUrl: "https://www.confetti.ba/bs/popust/iskoristi?kod=CONF-ABCD-2345",
  unsubscribeUrl: "https://www.confetti.ba/bs/popust/odjava?t=tok",
  siteUrl: "https://www.confetti.ba",
};

describe("renderLeadEmail", () => {
  it("gives the code, both prices and the expiry in the welcome", () => {
    const e = renderLeadEmail("welcome", base);
    expect(e.subject).toBe("Vaš kod za popust: 69 KM umjesto 79 KM");
    for (const part of ["CONF-ABCD-2345", "69 KM", "79 KM", "17. 12. 2026.", base.redeemUrl, base.unsubscribeUrl]) {
      expect(e.html).toContain(part);
      expect(e.text).toContain(part);
    }
  });

  it("counts the days left in the reminder", () => {
    expect(renderLeadEmail("reminder", base).subject).toBe("Vaš popust još čeka, vrijedi još 20 dana");
    expect(renderLeadEmail("reminder", { ...base, locale: "en" }).subject).toBe("Your discount is still waiting, 20 days left");
  });

  it("offers the extra 5 KM in the last email", () => {
    const e = renderLeadEmail("final", { ...base, daysLeft: 3 });
    expect(e.subject).toBe("Još 3 dana: dodatnih 5 KM popusta, 64 KM");
    expect(e.text).toContain("64 KM umjesto 79 KM");
  });

  it("escapes what it puts into HTML", () => {
    const e = renderLeadEmail("welcome", { ...base, redeemUrl: 'https://x.ba/?a="><script>' });
    expect(e.html).not.toContain('"><script>');
  });

  it("never doubles the full stop after a Bosnian date", () => {
    for (const kind of ["welcome", "reminder", "final"] as const) expect(renderLeadEmail(kind, base).text).not.toContain("..");
  });

  it("never uses an em dash", () => {
    for (const kind of ["welcome", "reminder", "final"] as const) {
      for (const locale of ["bs", "en"] as const) expect(renderLeadEmail(kind, { ...base, locale }).text).not.toContain("—");
    }
  });
});

describe("formatEmailDate", () => {
  it("writes dates as people in each language do, in Sarajevo time", () => {
    expect(formatEmailDate("2026-12-16T23:30:00Z", "bs")).toBe("17. 12. 2026.");
    expect(formatEmailDate("2026-12-17T09:00:00Z", "en")).toBe("17 December 2026");
  });
});
