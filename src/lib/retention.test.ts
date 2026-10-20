import { describe, expect, it } from "vitest";

import { TRIAL_DURATION_DAYS } from "@/lib/constants";
import {
  COUPLE_PURGE_GRACE_DAYS,
  UNPAID_TRIAL_PURGE_DAYS,
  isNeverPaid,
  retentionNotice,
  retentionSchedule,
  shouldPurge,
} from "@/lib/retention";

const DAY = 24 * 60 * 60 * 1000;
const at = (iso: string, days = 0) => new Date(new Date(iso).getTime() + days * DAY);

const couple = { account_type: "couple", role: "photographer", created_at: "2026-01-01T00:00:00Z" };
const neverPaid = {
  account_type: "photographer",
  role: "photographer",
  created_at: "2026-01-01T00:00:00Z",
  subscription_status: null,
  subscription_external_id: null,
};

describe("One Event galleries", () => {
  const accessEnds = "2026-04-01T00:00:00Z";
  const schedule = retentionSchedule(couple, accessEnds);

  it("keeps the files for the grace period after the gallery closes", () => {
    expect(shouldPurge(schedule, at(accessEnds, COUPLE_PURGE_GRACE_DAYS - 1))).toBe(false);
    expect(shouldPurge(schedule, at(accessEnds, COUPLE_PURGE_GRACE_DAYS + 1))).toBe(true);
  });

  it("counts from an earlier expiry the owner chose", () => {
    const early = retentionSchedule(couple, "2026-02-01T00:00:00Z");
    expect(shouldPurge(early, at("2026-02-01T00:00:00Z", COUPLE_PURGE_GRACE_DAYS + 1))).toBe(true);
    expect(shouldPurge(schedule, at("2026-02-01T00:00:00Z", COUPLE_PURGE_GRACE_DAYS + 1))).toBe(false);
  });

  it("applies whether or not the couple paid — the 90 days are what was sold", () => {
    const paid = { ...couple, subscription_status: "active", subscription_external_id: "order_1" };
    expect(shouldPurge(retentionSchedule(paid, accessEnds), at(accessEnds, COUPLE_PURGE_GRACE_DAYS + 1))).toBe(true);
  });

  it("warns from the moment the gallery closes, urgently in the last week", () => {
    expect(retentionNotice(schedule, at(accessEnds, -1))).toBeNull();
    expect(retentionNotice(schedule, at(accessEnds, 1))).toMatchObject({ urgent: false });
    expect(retentionNotice(schedule, at(accessEnds, COUPLE_PURGE_GRACE_DAYS - 3))).toMatchObject({
      urgent: true,
      daysLeft: 3,
    });
    expect(retentionNotice(schedule, at(accessEnds, COUPLE_PURGE_GRACE_DAYS + 1))).toBeNull();
  });
});

describe("photographers", () => {
  const purgeDay = TRIAL_DURATION_DAYS + UNPAID_TRIAL_PURGE_DAYS;

  it("removes a never-paid trial only after the full grace period", () => {
    const schedule = retentionSchedule(neverPaid, null);
    expect(shouldPurge(schedule, at(neverPaid.created_at, purgeDay - 1))).toBe(false);
    expect(shouldPurge(schedule, at(neverPaid.created_at, purgeDay + 1))).toBe(true);
  });

  it("never touches a paying photographer", () => {
    const active = { ...neverPaid, subscription_status: "active", subscription_external_id: "sub_1" };
    expect(isNeverPaid(active)).toBe(false);
    expect(retentionSchedule(active, null)).toBeNull();
  });

  it("leaves someone who paid and later cancelled to a human decision", () => {
    const cancelled = { ...neverPaid, subscription_status: "canceled", subscription_external_id: "sub_1" };
    expect(isNeverPaid(cancelled)).toBe(false);
    expect(retentionSchedule(cancelled, null)).toBeNull();
  });

  it("never touches an admin, whatever the account type", () => {
    expect(retentionSchedule({ ...neverPaid, role: "admin" }, null)).toBeNull();
    expect(retentionSchedule({ ...couple, role: "admin" }, "2026-01-01T00:00:00Z")).toBeNull();
  });
});
