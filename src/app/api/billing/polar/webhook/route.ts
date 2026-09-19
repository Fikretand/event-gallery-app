import { NextResponse } from "next/server";

import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks.js";

import { planFromPolarProduct } from "@/lib/billing";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/types";

/**
 * Polar webhook handler.
 *
 * Verification: Polar signs every delivery (Standard Webhooks). `validateEvent`
 * checks the signature against POLAR_WEBHOOK_SECRET and throws
 * WebhookVerificationError on a mismatch, so an unsigned POST can never reach
 * the account update below.
 *
 * User matching: the checkout carries the buyer's account id in
 * `metadata.userId` and in `externalCustomerId`, so activation lands on the
 * exact account that started the purchase — unlike Payhip, where it depended
 * on the buyer paying with their account email. Email is only a last resort.
 *
 * Gate: returns 503 until POLAR_WEBHOOK_SECRET is set.
 */

type Resolution = {
  userId: string | null;
  productId: string | null;
  externalId: string | null;
  status: SubscriptionStatus;
  renewsAt: string | null;
};

function asMetadataUserId(metadata: Record<string, unknown> | undefined | null): string | null {
  const value = metadata?.userId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const secret = env.polarWebhookSecret;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(raw, headers, secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
    }
    throw error;
  }

  // ── Map the event onto a single account update ───────────────────────────
  let resolved: Resolution | null = null;
  let email: string | null = null;

  switch (event.type) {
    case "order.paid":
    case "order.refunded": {
      const order = event.data;
      const refunded = event.type === "order.refunded";
      email = order.customer?.email?.trim().toLowerCase() || null;
      resolved = {
        userId: asMetadataUserId(order.metadata) ?? order.customer?.externalId ?? null,
        productId: order.productId ?? order.product?.id ?? null,
        // Subscription orders are tracked by their subscription id so renewals
        // and cancellations update the same row; one-time orders use the order.
        externalId: order.subscriptionId ?? order.id,
        status: refunded ? "canceled" : "active",
        renewsAt: null,
      };
      break;
    }
    case "subscription.active":
    case "subscription.uncanceled":
    case "subscription.canceled":
    case "subscription.revoked":
    case "subscription.past_due":
    case "subscription.updated": {
      const subscription = event.data;
      email = subscription.customer?.email?.trim().toLowerCase() || null;
      const status: SubscriptionStatus =
        subscription.status === "active"
          ? "active"
          : subscription.status === "trialing"
            ? "trialing"
            : subscription.status === "past_due"
              ? "past_due"
              : "canceled";
      resolved = {
        userId: asMetadataUserId(subscription.metadata) ?? subscription.customer?.externalId ?? null,
        productId: subscription.productId ?? null,
        externalId: subscription.id,
        status,
        // `canceled` subscriptions keep access until the period ends, but we
        // only store a renewal date while the subscription is still renewing.
        renewsAt:
          status === "active" || status === "trialing"
            ? (subscription.currentPeriodEnd?.toISOString() ?? null)
            : null,
      };
      break;
    }
    default:
      // Everything else (checkout.*, customer.*, benefit.*) needs no account
      // change — acknowledge so Polar stops retrying.
      return NextResponse.json({ received: true, event: event.type, note: "ignored" });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client unavailable." }, { status: 500 });
  }

  // ── Resolve the account: metadata/external id first, email as fallback ────
  let userId = resolved.userId;
  if (userId) {
    const { data } = await admin.from("users").select("id").eq("id", userId).maybeSingle();
    if (!data?.id) userId = null;
  }
  if (!userId && email) {
    const { data } = await admin.from("users").select("id").eq("email", email).maybeSingle();
    userId = (data?.id as string | undefined) ?? null;
  }

  if (!userId) {
    // Nothing to activate. Acknowledge (a 4xx would make Polar retry forever)
    // but log it — a paid order with no account is worth a manual look.
    console.error("[polar-webhook] no matching account", {
      event: event.type,
      externalId: resolved.externalId,
    });
    return NextResponse.json({ received: true, event: event.type, note: "user not found" });
  }

  const update: Record<string, unknown> = {
    subscription_provider: "polar",
    subscription_external_id: resolved.externalId,
    subscription_status: resolved.status,
    subscription_renews_at: resolved.renewsAt,
  };

  // Photographer plans carry a feature tier; the couple one-time purchase does
  // not — the couple account type already gates the right feature set.
  const planInfo = resolved.productId ? planFromPolarProduct(resolved.productId) : null;
  if (resolved.status !== "canceled" && (planInfo?.plan === "solo" || planInfo?.plan === "pro")) {
    update.plan_tier = planInfo.plan;
  }

  const { error: updateError } = await admin.from("users").update(update).eq("id", userId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    event: event.type,
    plan: planInfo?.plan ?? "unknown",
    status: resolved.status,
  });
}
