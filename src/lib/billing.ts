import { Polar } from "@polar-sh/sdk";

import { env, hasPayments, hasPolar } from "@/lib/env";
import type { BillingCycle, UserRecord } from "@/lib/types";

export { hasPayments, hasPolar };

export type PlanId = "solo" | "pro";
export type CheckoutPlanId = PlanId | "couple";

/**
 * Displayed price of the One Event plan, per provider. Polar sells it in BAM
 * (79,00 KM ≈ €39); the legacy Payhip product is still priced in EUR.
 */
export const ONE_EVENT_PRICE = { polar: "79,00 KM", payhip: "€39" } as const;

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

// ── Polar (Merchant of Record) ───────────────────────────────────────────────

function polarClient() {
  if (!env.polarAccessToken) throw new Error("PAYMENTS_NOT_CONFIGURED");
  return new Polar({ accessToken: env.polarAccessToken, server: env.polarServer });
}

/** Polar product id for a plan + cycle, or undefined when not configured. */
export function getPolarProductId(plan: CheckoutPlanId, cycle: BillingCycle): string | undefined {
  if (plan === "couple") return env.polarProductOneEvent;
  const map: Record<PlanId, Record<BillingCycle, string | undefined>> = {
    solo: { monthly: env.polarProductSoloMonthly, yearly: env.polarProductSoloYearly },
    pro: { monthly: env.polarProductProMonthly, yearly: env.polarProductProYearly },
  };
  return map[plan][cycle];
}

/** Reverse lookup: which plan + cycle does a Polar product id belong to? */
export function planFromPolarProduct(productId: string): {
  plan: CheckoutPlanId;
  cycle: BillingCycle | "one_time";
} | null {
  if (!productId) return null;
  if (productId === env.polarProductOneEvent) return { plan: "couple", cycle: "one_time" };
  if (productId === env.polarProductSoloMonthly) return { plan: "solo", cycle: "monthly" };
  if (productId === env.polarProductSoloYearly) return { plan: "solo", cycle: "yearly" };
  if (productId === env.polarProductProMonthly) return { plan: "pro", cycle: "monthly" };
  if (productId === env.polarProductProYearly) return { plan: "pro", cycle: "yearly" };
  return null;
}

/**
 * The forms of the webhook signing secret worth trying.
 *
 * Polar's dashboard shows the secret with a `whsec_` prefix, and whether it
 * signs with that prefix or with the bare value is not something this codebase
 * has confirmed — the two produce different HMAC keys, so guessing wrong
 * rejects every delivery. Trying both removes the question. Both candidates
 * derive from the same configured secret, so accepting either loosens nothing:
 * a caller still has to know the secret.
 */
export function polarSecretCandidates(secret: string): string[] {
  const PREFIX = "whsec_";
  return secret.startsWith(PREFIX)
    ? [secret.slice(PREFIX.length), secret]
    : [secret, `${PREFIX}${secret}`];
}

/**
 * Create a Polar checkout session and return its hosted URL.
 *
 * The buyer's account id travels in `metadata` and `externalCustomerId`, so the
 * webhook activates the exact account that started the purchase. This is the
 * main reason to prefer Polar over Payhip here: Payhip carried no metadata, so
 * activation depended on the buyer happening to pay with their account email.
 */
export async function createPolarCheckout(opts: {
  productId: string;
  user: { id: string; email: string };
  successUrl: string;
}): Promise<string> {
  const checkout = await polarClient().checkouts.create({
    products: [opts.productId],
    customerEmail: opts.user.email || undefined,
    externalCustomerId: opts.user.id,
    metadata: { userId: opts.user.id },
    successUrl: opts.successUrl,
  });

  if (!checkout.url) throw new Error("Checkout URL missing in Polar response.");
  return checkout.url;
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
