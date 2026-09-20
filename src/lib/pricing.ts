import type { BillingCycle } from "@/lib/types";

/**
 * Every price the product quotes, in one place.
 *
 * Marketing pages, the dashboard plan chooser and the Polar catalogue have to
 * agree — a visitor who reads one number on the pricing page and sees another
 * at checkout has caught us lying, however innocently. This module is the
 * source, and it deliberately imports nothing (no `env`, no server code) so a
 * client component can read it without dragging the server bundle along.
 *
 * When a price changes here it must change in Polar too. The product ids live
 * in `POLAR_PRODUCT_*`; the amounts live in the Polar dashboard.
 */

export type PlanId = "solo" | "pro";
export type CheckoutPlanId = PlanId | "couple";

/** Months charged in one go on a yearly plan. */
export const MONTHS_PER_YEAR = 12;

/** BAM is what Polar charges. Per month, as displayed. */
export const PLAN_PRICING_BAM: Record<PlanId, Record<BillingCycle, number>> = {
  solo: { monthly: 49, yearly: 39 },
  pro: { monthly: 99, yearly: 79 },
};

/** EUR per month — the legacy providers' pricing, kept for the fallback path. */
export const PLAN_PRICING: Record<PlanId, Record<BillingCycle, number>> = {
  solo: { monthly: 24, yearly: 19 },
  pro: { monthly: 49, yearly: 39 },
};

/** One-time price of the couple plan, per provider. */
export const ONE_EVENT_PRICE = { polar: "79,00 KM", payhip: "€39" } as const;

/** The bare number behind the Polar One Event price, for arithmetic and copy. */
export const ONE_EVENT_BAM = 79;

export function formatBam(amount: number): string {
  return `${amount} KM`;
}

/** What a yearly plan actually charges in one payment. */
export function yearlyTotalBam(plan: PlanId): number {
  return PLAN_PRICING_BAM[plan].yearly * MONTHS_PER_YEAR;
}

/**
 * How much the yearly plan saves, as a whole percent.
 *
 * Derived rather than written down, so the claim on the pricing page cannot
 * survive a price change that makes it false.
 */
export function annualSavingPercent(plan: PlanId): number {
  const { monthly, yearly } = PLAN_PRICING_BAM[plan];
  if (monthly <= 0) return 0;
  return Math.round(((monthly - yearly) / monthly) * 100);
}

/** Which table to quote from, given the provider that will take the payment. */
export function planPricingFor(provider: "polar" | "payhip"): {
  pricing: Record<PlanId, Record<BillingCycle, number>>;
  currency: "BAM" | "EUR";
} {
  return provider === "polar"
    ? { pricing: PLAN_PRICING_BAM, currency: "BAM" }
    : { pricing: PLAN_PRICING, currency: "EUR" };
}
