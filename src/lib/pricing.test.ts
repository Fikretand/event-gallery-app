import { describe, expect, it } from "vitest";

import { couplePlan, photographerPlans } from "@/lib/marketing";
import {
  MONTHS_PER_YEAR,
  ONE_EVENT_BAM,
  ONE_EVENT_PRICE,
  PLAN_PRICING_BAM,
  annualSavingPercent,
  planPricingFor,
  yearlyTotalBam,
} from "@/lib/pricing";

/**
 * A visitor who reads one price on the pricing page and meets another at
 * checkout has caught us lying. These tests keep the marketing surface tied to
 * the same numbers the dashboard quotes.
 */
describe("pricing", () => {
  it("quotes the marketing cards from the pricing table, not from copies", () => {
    const [solo, pro] = photographerPlans;
    expect(solo.monthlyPrice).toBe(`${PLAN_PRICING_BAM.solo.monthly} KM`);
    expect(solo.yearlyPrice).toBe(`${PLAN_PRICING_BAM.solo.yearly} KM`);
    expect(pro.monthlyPrice).toBe(`${PLAN_PRICING_BAM.pro.monthly} KM`);
    expect(pro.yearlyPrice).toBe(`${PLAN_PRICING_BAM.pro.yearly} KM`);
    expect(couplePlan.price).toBe(`${ONE_EVENT_BAM} KM`);
  });

  it("states the yearly total as twelve months, which is what is charged", () => {
    expect(yearlyTotalBam("solo")).toBe(PLAN_PRICING_BAM.solo.yearly * MONTHS_PER_YEAR);
    expect(photographerPlans[0].yearlyTotal).toBe(`${yearlyTotalBam("solo")} KM`);
    expect(photographerPlans[1].yearlyTotal).toBe(`${yearlyTotalBam("pro")} KM`);
  });

  it("derives the saving claim so it cannot outlive a price change", () => {
    // 49 → 39 and 99 → 79 are both a fraction over 20%.
    expect(annualSavingPercent("solo")).toBe(20);
    expect(annualSavingPercent("pro")).toBe(20);
    expect(photographerPlans[0].savingPercent).toBe(annualSavingPercent("solo"));
  });

  it("keeps the yearly plan genuinely cheaper per month than the monthly one", () => {
    for (const plan of ["solo", "pro"] as const) {
      expect(PLAN_PRICING_BAM[plan].yearly).toBeLessThan(PLAN_PRICING_BAM[plan].monthly);
      expect(annualSavingPercent(plan)).toBeGreaterThan(0);
    }
  });

  it("keeps Pro above Solo on both cycles", () => {
    expect(PLAN_PRICING_BAM.pro.monthly).toBeGreaterThan(PLAN_PRICING_BAM.solo.monthly);
    expect(PLAN_PRICING_BAM.pro.yearly).toBeGreaterThan(PLAN_PRICING_BAM.solo.yearly);
  });

  it("matches the one-time label to the number the marketing card shows", () => {
    expect(ONE_EVENT_PRICE.polar.startsWith(String(ONE_EVENT_BAM))).toBe(true);
  });

  it("switches the whole table with the provider, never mixing currencies", () => {
    expect(planPricingFor("polar")).toMatchObject({ pricing: PLAN_PRICING_BAM, currency: "BAM" });
    expect(planPricingFor("payhip").currency).toBe("EUR");
  });
});
