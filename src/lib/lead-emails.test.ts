import { describe, expect, it } from "vitest";

import { formatEmailDate, renderLeadEmail, type LeadEmailInput } from "./lead-emails";

const base: LeadEmailInput = {
  locale: "bs",
  code: "CONF-ABCD-2345",
  email: "ana@primjer.ba",
  account: "none",
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
    for (const kind of ["welcome", "reminder", "final", "trial"] as const) {
      for (const account of ["none", "couple", "photographer", "paid"] as const) {
        expect(renderLeadEmail(kind, { ...base, account }).text).not.toContain("..");
      }
    }
  });

  it("never uses an em dash", () => {
    for (const kind of ["welcome", "reminder", "final", "trial"] as const) {
      for (const locale of ["bs", "en"] as const) expect(renderLeadEmail(kind, { ...base, locale }).text).not.toContain("—");
    }
  });
});

describe("instructions by account", () => {
  it("tells someone without an account to sign up with this same address", () => {
    const e = renderLeadEmail("welcome", base);
    expect(e.cta).toBe("Napravi nalog i iskoristi popust");
    expect(e.steps[0]).toContain("ana@primjer.ba");
    expect(e.steps[0]).toContain("istom na koju vam je stigao");
    expect(e.text).toContain("1. Kliknite dugme");
    expect(e.text).toContain("u polje „Imate kod za popust?“");
  });

  it("tells an account holder to sign in, not to sign up", () => {
    const e = renderLeadEmail("welcome", { ...base, account: "couple" });
    expect(e.cta).toBe("Prijavi se i iskoristi popust");
    expect(e.text).toContain("već imate Confetti nalog");
    expect(e.text).not.toContain("napravite nalog");
    expect(renderLeadEmail("reminder", { ...base, account: "couple" }).text).toContain("Prijavite se svojim nalogom (ana@primjer.ba)");
  });

  it("explains that a photographer or a paid account needs another account for this code", () => {
    expect(renderLeadEmail("welcome", { ...base, account: "photographer" }).text).toContain("nalog za fotografe");
    expect(renderLeadEmail("welcome", { ...base, account: "paid" }).text).toContain("već ima plaćen paket");
  });

  it("prices the last email's steps at the last-offer price", () => {
    expect(renderLeadEmail("final", { ...base, account: "couple", daysLeft: 3 }).text).toContain("64 KM umjesto 79 KM");
  });
});

describe("after-trial email", () => {
  it("offers 10 KM off for the days left and sends the account holder to sign in", () => {
    const e = renderLeadEmail("trial", { ...base, account: "couple", daysLeft: 5, expiresAt: "2026-11-23T08:00:00Z" });
    expect(e.subject).toBe("Probni period je završio: 69 KM umjesto 79 KM, još 5 dana");
    expect(e.cta).toBe("Prijavi se i iskoristi popust");
    for (const part of ["10 KM manje", "23. 11. 2026.", "CONF-ABCD-2345", "Šaljemo ga samo jednom"]) expect(e.text).toContain(part);
    expect(renderLeadEmail("trial", { ...base, locale: "en", daysLeft: 5 }).subject).toBe("Your trial has ended: 69 KM instead of 79 KM, 5 days left");
  });
});

describe("formatEmailDate", () => {
  it("writes dates as people in each language do, in Sarajevo time", () => {
    expect(formatEmailDate("2026-12-16T23:30:00Z", "bs")).toBe("17. 12. 2026.");
    expect(formatEmailDate("2026-12-17T09:00:00Z", "en")).toBe("17 December 2026");
  });
});
