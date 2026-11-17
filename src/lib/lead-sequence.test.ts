import { describe, expect, it } from "vitest";

import {
  CODE_PATTERN,
  DEFAULT_LEAD_SETTINGS,
  cleanUtm,
  daysLeft,
  dueLeadEmail,
  leadSchedule,
  newLeadCode,
  normalizeEmail,
  normalizeLeadCode,
  offerTier,
  validSettings,
  type LeadEmailKind,
} from "./lead-sequence";

const START = new Date("2026-11-17T09:00:00Z");
const day = (n: number) => new Date(START.getTime() + n * 86_400_000);
const lead = { status: "active" as const, unsubscribed_at: null, ...leadSchedule(DEFAULT_LEAD_SETTINGS, START) };
const sent = (...kinds: LeadEmailKind[]) => new Set<LeadEmailKind>(kinds);

describe("codes", () => {
  it("makes codes in the shape the database accepts, without look-alike characters", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = newLeadCode();
      expect(code).toMatch(CODE_PATTERN);
      expect(code.slice(5)).not.toMatch(/[01OI]/);
    }
  });

  it("reads codes the way people type them", () => {
    expect(normalizeLeadCode("conf-abcd-2345")).toBe("CONF-ABCD-2345");
    expect(normalizeLeadCode(" CONF ABCD 2345 ")).toBe("CONF-ABCD-2345");
    expect(normalizeLeadCode("abcd2345")).toBe("CONF-ABCD-2345");
    expect(normalizeLeadCode("CONF-ABCD-234")).toBeNull();
    expect(normalizeLeadCode("CONF-ABCD-2340")).toBeNull();
    expect(normalizeLeadCode("")).toBeNull();
  });
});

describe("emails and campaign labels", () => {
  it("accepts real addresses and refuses the rest", () => {
    expect(normalizeEmail("  Ana.Hodzic@Gmail.com ")).toBe("ana.hodzic@gmail.com");
    expect(normalizeEmail("ana@gmail")).toBeNull();
    expect(normalizeEmail("ana gmail.com")).toBeNull();
    expect(normalizeEmail("<ana@gmail.com>")).toBeNull();
  });

  it("keeps UTM labels short and plain", () => {
    expect(cleanUtm("Instagram")).toBe("instagram");
    expect(cleanUtm("tiktok<script>")).toBe("tiktokscript");
    expect(cleanUtm("")).toBeNull();
    expect(cleanUtm(undefined)).toBeNull();
  });
});

describe("schedule", () => {
  it("puts the reminder on day 10, the last offer on day 27 and the expiry on day 30", () => {
    expect(lead.reminder_at).toBe(day(10).toISOString());
    expect(lead.final_at).toBe(day(27).toISOString());
    expect(lead.expires_at).toBe(day(30).toISOString());
  });

  it("refuses settings where the reminder would not come before the last offer", () => {
    expect(validSettings(DEFAULT_LEAD_SETTINGS)).toBeNull();
    expect(validSettings({ ...DEFAULT_LEAD_SETTINGS, reminder_day: 27 })).not.toBeNull();
    expect(validSettings({ ...DEFAULT_LEAD_SETTINGS, valid_days: 5 })).not.toBeNull();
    expect(validSettings({ ...DEFAULT_LEAD_SETTINGS, final_days_before: 0 })).not.toBeNull();
  });
});

describe("dueLeadEmail", () => {
  it("sends the welcome at once, then nothing until the reminder", () => {
    expect(dueLeadEmail(lead, sent(), START)).toBe("welcome");
    expect(dueLeadEmail(lead, sent("welcome"), day(5))).toBeNull();
    expect(dueLeadEmail(lead, sent("welcome"), day(10))).toBe("reminder");
    expect(dueLeadEmail(lead, sent("welcome", "reminder"), day(20))).toBeNull();
  });

  it("sends the last offer in its window, once", () => {
    expect(dueLeadEmail(lead, sent("welcome", "reminder"), day(27))).toBe("final");
    expect(dueLeadEmail(lead, sent("welcome", "reminder", "final"), day(28))).toBeNull();
  });

  it("skips a missed reminder once the last offer is due", () => {
    expect(dueLeadEmail(lead, sent("welcome"), day(28))).toBe("final");
  });

  it("sends nothing after a purchase, an unsubscribe or the expiry", () => {
    expect(dueLeadEmail({ ...lead, status: "redeemed" }, sent("welcome"), day(10))).toBeNull();
    expect(dueLeadEmail({ ...lead, unsubscribed_at: day(1).toISOString() }, sent("welcome"), day(10))).toBeNull();
    expect(dueLeadEmail(lead, sent("welcome", "reminder"), day(30))).toBeNull();
  });
});

describe("offerTier and daysLeft", () => {
  it("prices the code by the window it is in", () => {
    expect(offerTier(lead, day(0))).toBe("offer");
    expect(offerTier(lead, day(26.9))).toBe("offer");
    expect(offerTier(lead, day(27))).toBe("final");
    expect(offerTier(lead, day(30))).toBeNull();
  });

  it("counts the days left upwards", () => {
    expect(daysLeft(lead.expires_at, day(10))).toBe(20);
    expect(daysLeft(lead.expires_at, day(27.5))).toBe(3);
    expect(daysLeft(lead.expires_at, day(31))).toBe(0);
  });
});
