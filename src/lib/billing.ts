import { createHmac, timingSafeEqual } from "node:crypto";

import { env, hasPayments, hasWhop } from "@/lib/env";
import type { CheckoutPlanId, PlanId } from "@/lib/pricing";
import type { BillingCycle, UserRecord } from "@/lib/types";

export { hasPayments, hasWhop };

export type { PlanId, CheckoutPlanId } from "@/lib/pricing";
export {
  ONE_EVENT_PRICE,
  PLAN_PRICING,
  PLAN_PRICING_BAM,
  annualSavingPercent,
  formatBam,
  planPricingFor,
  yearlyTotalBam,
} from "@/lib/pricing";

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

/**
 * Whether a purchased plan is one this kind of account can hold. One Event is
 * the couple product and Solo/Pro are the photographer subscriptions; a
 * mismatch (a photographer buying One Event, or an unknown product) must not
 * touch the account, or a 79 KM one-time order would grant a permanent paid
 * photographer plan. Applies to every status, a refund included: refunding the
 * stray order must not cancel the subscription the account really has.
 */
export function planFitsAccount(plan: CheckoutPlanId | null | undefined, accountType: string | null | undefined) {
  if (!plan) return false;
  return accountType === "couple" ? plan === "couple" : plan === "solo" || plan === "pro";
}

/**
 * Whether a billing event should change the account, given what was applied
 * before. Webhooks can arrive late, twice, or out of order:
 *
 * - "stale": older than the last event applied (a retried `order.paid` landing
 *   after the `subscription.revoked` that followed it must not re-activate).
 * - "other_entitlement": a downgrade (refund, cancel, past due) for a purchase
 *   that is not the one the account holds now — refunding an old order must
 *   not cancel the subscription bought since.
 */
export function billingEventDecision(input: {
  eventAt: Date | null;
  lastAppliedAt: string | null | undefined;
  status: string | null;
  externalId: string | null;
  currentExternalId: string | null | undefined;
}): "apply" | "stale" | "other_entitlement" {
  if (input.eventAt && input.lastAppliedAt && input.eventAt.getTime() < new Date(input.lastAppliedAt).getTime()) {
    return "stale";
  }
  const downgrade = input.status !== "active" && input.status !== "trialing";
  if (downgrade && input.currentExternalId && input.externalId !== input.currentExternalId) {
    return "other_entitlement";
  }
  return "apply";
}

// ── Whop (active provider) ───────────────────────────────────────────────────

/**
 * Payload shape the webhook and the REST reads are pinned to. Whop versions
 * `data` by date; pinning keeps a field rename on their side from silently
 * breaking activation here. The webhook endpoint is created with the same pin.
 */
export const WHOP_API_VERSION_DATE = "2026-08-14";

function whopApiBase(): string {
  return env.whopEnvironment === "sandbox"
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1";
}

/** Authenticated call to the Whop REST API. Throws with Whop's own error body. */
export async function whopRequest<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  if (!env.whopApiKey) throw new Error("PAYMENTS_NOT_CONFIGURED");
  const res = await fetch(`${whopApiBase()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${env.whopApiKey}`,
      "Api-Version-Date": WHOP_API_VERSION_DATE,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Whop ${init.method ?? "GET"} ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** Whop plan (`plan_…`) for a plan + cycle, or undefined when not configured. */
export function getWhopPlanId(plan: CheckoutPlanId, cycle: BillingCycle): string | undefined {
  if (plan === "couple") return env.whopPlanOneEvent;
  const map: Record<PlanId, Record<BillingCycle, string | undefined>> = {
    solo: { monthly: env.whopPlanSoloMonthly, yearly: env.whopPlanSoloYearly },
    pro: { monthly: env.whopPlanProMonthly, yearly: env.whopPlanProYearly },
  };
  return map[plan][cycle];
}

/** Reverse lookup: which plan + cycle does a Whop plan id belong to? */
export function planFromWhopPlan(planId: string | null | undefined): {
  plan: CheckoutPlanId;
  cycle: BillingCycle | "one_time";
} | null {
  if (!planId) return null;
  if (planId === env.whopPlanOneEvent) return { plan: "couple", cycle: "one_time" };
  if (planId === env.whopPlanSoloMonthly) return { plan: "solo", cycle: "monthly" };
  if (planId === env.whopPlanSoloYearly) return { plan: "solo", cycle: "yearly" };
  if (planId === env.whopPlanProMonthly) return { plan: "pro", cycle: "monthly" };
  if (planId === env.whopPlanProYearly) return { plan: "pro", cycle: "yearly" };
  return null;
}

/**
 * Create a Whop checkout configuration and return its hosted URL.
 *
 * The buyer's account id travels in `metadata.userId`. Whop copies checkout
 * metadata onto the payment and the membership it creates, so every webhook
 * for this purchase — first payment, renewals, cancellation — names the exact
 * account that started it, whatever email the buyer pays with.
 */
export async function createWhopCheckout(opts: {
  planId: string;
  user: { id: string };
  redirectUrl: string;
}): Promise<string> {
  const checkout = await whopRequest<{ purchase_url?: string | null }>("/checkout_configurations", {
    method: "POST",
    body: {
      ...(env.whopAccountId ? { account_id: env.whopAccountId } : {}),
      variant_id: opts.planId,
      metadata: { userId: opts.user.id },
      redirect_url: opts.redirectUrl,
    },
  });
  if (!checkout.purchase_url) throw new Error("Checkout URL missing in Whop response.");
  return checkout.purchase_url;
}

/**
 * Verify a Whop webhook delivery (Standard Webhooks).
 *
 * Whop signs `${webhook-id}.${webhook-timestamp}.${body}` with HMAC-SHA256,
 * keyed on the literal UTF-8 bytes of the `ws_…` secret, prefix included —
 * unlike Polar, nothing is stripped or base64-decoded (this is what
 * `unwrapWebhook` in `@whop/sdk` does too). The header is a space-separated
 * list of `v1,<base64 mac>`.
 */
export function verifyWhopSignature(input: {
  secret: string;
  id: string;
  timestamp: string;
  body: string;
  signatureHeader: string;
}): boolean {
  const expected = Buffer.from(
    createHmac("sha256", Buffer.from(input.secret, "utf8"))
      .update(`${input.id}.${input.timestamp}.${input.body}`)
      .digest("base64"),
    "utf8",
  );
  return input.signatureHeader
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.includes(",") ? part.slice(part.indexOf(",") + 1) : part))
    .some((candidate) => {
      const provided = Buffer.from(candidate, "utf8");
      return provided.length === expected.length && timingSafeEqual(provided, expected);
    });
}

/**
 * Map a Whop membership status onto ours. `active`/`trialing` grant access and
 * `past_due` is Whop's grace period; everything else (`canceled`, `expired`,
 * `completed`, `unresolved`) means the subscription has ended.
 */
export function whopMembershipStatus(status: string | null | undefined): "active" | "trialing" | "past_due" | "canceled" {
  if (status === "active" || status === "trialing" || status === "past_due") return status;
  return "canceled";
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
