import { env, hasPayments } from "@/lib/env";
import type { BillingCycle, UserRecord } from "@/lib/types";

export { hasPayments };

export type PlanId = "solo" | "pro";
export type CheckoutPlanId = PlanId | "couple";

/** EUR per month, by billing cycle. Mirrors the marketing pricing. */
export const PLAN_PRICING: Record<PlanId, Record<BillingCycle, number>> = {
  solo: { monthly: 24, yearly: 19 },
  pro: { monthly: 49, yearly: 39 },
};

// ── Payhip (active provider) ─────────────────────────────────────────────────

/**
 * Build a Payhip hosted checkout URL for a given product key.
 * Passing `email` pre-fills the buyer's email on the Payhip checkout page.
 */
export function payhipCheckoutUrl(productKey: string, email: string): string {
  return `https://payhip.com/b/${productKey}?email=${encodeURIComponent(email)}`;
}

/** Product key for a given photographer plan + billing cycle, or undefined if not yet configured. */
export function getPayhipProductKey(plan: PlanId, cycle: BillingCycle): string | undefined {
  const map: Record<PlanId, Record<BillingCycle, string | undefined>> = {
    solo: { monthly: env.payhipProductSoloMonthly, yearly: env.payhipProductSoloYearly },
    pro: { monthly: env.payhipProductProMonthly, yearly: env.payhipProductProYearly },
  };
  return map[plan][cycle];
}

/** Reverse lookup: which plan + cycle does a Payhip product key belong to? */
export function planFromPayhipProduct(productKey: string): {
  plan: CheckoutPlanId;
  cycle: BillingCycle | "one_time";
} | null {
  if (!productKey) return null;
  if (productKey === env.payhipProductOneEvent) return { plan: "couple", cycle: "one_time" };
  if (productKey === env.payhipProductSoloMonthly) return { plan: "solo", cycle: "monthly" };
  if (productKey === env.payhipProductSoloYearly) return { plan: "solo", cycle: "yearly" };
  if (productKey === env.payhipProductProMonthly) return { plan: "pro", cycle: "monthly" };
  if (productKey === env.payhipProductProYearly) return { plan: "pro", cycle: "yearly" };
  return null;
}

// ── LemonSqueezy (dormant — kept for future re-activation) ───────────────────

/** LemonSqueezy variant id for a given plan + cycle (undefined until configured). */
export function getVariantId(plan: PlanId, cycle: BillingCycle): string | undefined {
  const map: Record<PlanId, Record<BillingCycle, string | undefined>> = {
    solo: { monthly: env.lsVariantSoloMonthly, yearly: env.lsVariantSoloYearly },
    pro: { monthly: env.lsVariantProMonthly, yearly: env.lsVariantProYearly },
  };
  return map[plan][cycle];
}

/** Reverse lookup: which plan does a LemonSqueezy variant id belong to? */
export function planFromVariant(variantId: string): PlanId | null {
  const v = String(variantId);
  if (v === env.lsVariantSoloMonthly || v === env.lsVariantSoloYearly) return "solo";
  if (v === env.lsVariantProMonthly || v === env.lsVariantProYearly) return "pro";
  return null;
}

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Is the user a paying subscriber (active or in provider-managed trial), not just our free trial? */
export function hasActiveSubscription(
  user: Pick<UserRecord, "subscription_status">,
): boolean {
  return user.subscription_status === "active" || user.subscription_status === "trialing";
}

/**
 * Create a LemonSqueezy hosted checkout and return its URL.
 * Throws "PAYMENTS_NOT_CONFIGURED" / "PLAN_VARIANT_NOT_CONFIGURED" when dormant.
 */
export async function createCheckout(opts: {
  plan: PlanId;
  cycle: BillingCycle;
  user: { id: string; email: string };
  redirectUrl: string;
}): Promise<string> {
  if (!hasPayments) throw new Error("PAYMENTS_NOT_CONFIGURED");

  const variantId = getVariantId(opts.plan, opts.cycle);
  if (!variantId) throw new Error("PLAN_VARIANT_NOT_CONFIGURED");

  const res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${env.lemonSqueezyApiKey}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: opts.user.email,
            custom: { user_id: opts.user.id, plan: opts.plan },
          },
          product_options: { redirect_url: opts.redirectUrl },
        },
        relationships: {
          store: { data: { type: "stores", id: String(env.lemonSqueezyStoreId) } },
          variant: { data: { type: "variants", id: String(variantId) } },
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Checkout failed (${res.status}): ${await res.text()}`);
  }

  const json = await res.json();
  const url = json?.data?.attributes?.url as string | undefined;
  if (!url) throw new Error("Checkout URL missing in LemonSqueezy response.");
  return url;
}
