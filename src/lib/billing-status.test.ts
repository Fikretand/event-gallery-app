import { describe, expect, it } from "vitest";

import { describeBilling, describePlan } from "@/lib/billing-status";

const base = {
  account_type: "photographer" as const,
  plan_tier: "solo" as const,
  role: "photographer" as const,
  subscription_status: null,
  subscription_provider: null,
};

describe("describePlan", () => {
  it("never labels a couple account with a photographer tier", () => {
    // plan_tier defaults to "solo" for everyone, which made the admin list
    // read as though every couple were on a photographer plan.
    expect(describePlan("couple", "solo")).toBe("One Event");
    expect(describePlan("couple", "pro")).toBe("One Event");
  });

  it("keeps the tier for photographers", () => {
    expect(describePlan("photographer", "solo")).toBe("Solo");
    expect(describePlan("photographer", "pro")).toBe("Pro");
  });
});

describe("describeBilling", () => {
  it("separates paying from the built-in free trial", () => {
    expect(describeBilling({ ...base, subscription_status: "active", subscription_provider: "polar" }))
      .toMatchObject({ status: "Paid", provider: "polar", tone: "paid" });
    expect(describeBilling(base)).toMatchObject({ status: "Free trial", provider: null, tone: "trial" });
  });

  it("does not report a refunded or lapsed account as paying", () => {
    expect(describeBilling({ ...base, subscription_status: "canceled", subscription_provider: "polar" }))
      .toMatchObject({ status: "Canceled", tone: "ended" });
    expect(describeBilling({ ...base, subscription_status: "past_due", subscription_provider: "polar" }))
      .toMatchObject({ status: "Past due", tone: "overdue" });
  });

  it("reports admins as unlimited, whatever their subscription says", () => {
    // Admins bypass trial limits in computeTrialState, so any other label here
    // would misdescribe what the account can actually do.
    for (const status of [null, "canceled", "active"] as const) {
      expect(describeBilling({ ...base, role: "admin", subscription_status: status }).tone).toBe("admin");
    }
  });

  it("drops a stale provider name when nothing is subscribed", () => {
    const stale = describeBilling({ ...base, subscription_provider: "payhip" });
    expect(stale.provider).toBeNull();
  });
});
