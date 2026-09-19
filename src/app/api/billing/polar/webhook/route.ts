import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { validateEvent } from "@polar-sh/sdk/webhooks.js";

import { planFromPolarProduct, polarWebhookKeys } from "@/lib/billing";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/types";

/**
 * Polar webhook handler.
 *
 * Verification: Polar signs every delivery (Standard Webhooks). The signature
 * is checked here rather than by handing the secret to the SDK's
 * `validateEvent`, because that helper commits to one interpretation of the
 * secret and there are three in circulation — see `polarWebhookKeys`. An
 * unsigned or wrongly signed POST can never reach the account update below.
 *
 * Once a delivery is proven authentic, it is re-signed with the key the SDK
 * expects and passed through `validateEvent` anyway. That is only to reuse its
 * parsing: the raw payload is snake_case JSON and the handlers below want the
 * SDK's typed, camelCased models with real Date objects.
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

/** Standard Webhooks signs `${id}.${timestamp}.${body}` and base64s the MAC. */
function sign(key: Buffer, id: string, timestamp: string, body: string): string {
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Check the delivery against every key the secret could stand for, and report
 * which one matched so the convention Polar actually uses stops being a guess.
 */
function verifyDelivery(
  secret: string,
  id: string,
  timestamp: string,
  body: string,
  signatureHeader: string,
): string | null {
  // The header is a space-separated list of `v<version>,<base64 mac>`.
  const provided = signatureHeader
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => (part.includes(",") ? part.slice(part.indexOf(",") + 1) : part));

  for (const { label, key } of polarWebhookKeys(secret)) {
    const expected = sign(key, id, timestamp, body);
    if (provided.some((candidate) => equals(expected, candidate))) return label;
  }
  return null;
}

/** Replays are pointless beyond this, and the SDK enforces the same window. */
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

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

  const webhookId = headers["webhook-id"] ?? "";
  const webhookTimestamp = headers["webhook-timestamp"] ?? "";
  const webhookSignature = headers["webhook-signature"] ?? "";

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return NextResponse.json({ error: "Missing signature headers." }, { status: 400 });
  }

  const sentAt = Number(webhookTimestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > TIMESTAMP_TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "Stale or invalid timestamp." }, { status: 403 });
  }

  const matchedKey = verifyDelivery(secret, webhookId, webhookTimestamp, raw, webhookSignature);

  if (!matchedKey) {
    // Never log the secret. Its length and ends are enough to spot a truncated
    // or mis-pasted copy against what the Polar dashboard shows.
    console.error("[polar-webhook] signature rejected by every key derivation", {
      secretLength: secret.length,
      secretHead: secret.slice(0, 10),
      secretTail: secret.slice(-4),
      triedKeys: polarWebhookKeys(secret).map((candidate) => candidate.label),
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  // Authentic. Re-sign with the key the SDK derives so it will parse the body
  // into its typed models rather than reject a signature it cannot reproduce.
  const sdkKey = Buffer.from(secret, "utf8");
  const event = validateEvent(
    raw,
    {
      "webhook-id": webhookId,
      "webhook-timestamp": webhookTimestamp,
      "webhook-signature": `v1,${sign(sdkKey, webhookId, webhookTimestamp, raw)}`,
    },
    secret,
  );

  // Low-volume endpoint, and knowing which events actually arrive — and which
  // key derivation Polar signs with — is the only way to tell "handled" apart
  // from "silently ignored" after the fact.
  console.log("[polar-webhook] received", event.type, "via", matchedKey);

  // ── Map the event onto a single account update ───────────────────────────
  let resolved: Resolution | null = null;
  let email: string | null = null;

  switch (event.type) {
    case "order.created":
    case "order.paid":
    case "order.refunded": {
      const order = event.data;
      const refunded = event.type === "order.refunded";

      // `order.created` also fires for orders that are not settled yet, so it
      // is only acted on once the order says it is paid. A fully discounted
      // order (a 100% coupon) costs nothing to settle, and Polar appears to
      // announce it here rather than through `order.paid`.
      if (event.type === "order.created" && !order.paid) {
        return NextResponse.json({ received: true, event: event.type, note: "unpaid" });
      }

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
    // A paid order that did not activate the account. The most common cause is
    // a missing billing column — see supabase/migrations.
    console.error("[polar-webhook] account update failed", {
      event: event.type,
      userId,
      message: updateError.message,
      details: updateError.details,
    });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    event: event.type,
    plan: planInfo?.plan ?? "unknown",
    status: resolved.status,
  });
}
