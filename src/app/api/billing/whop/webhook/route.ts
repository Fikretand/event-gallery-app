import { NextResponse } from "next/server";

import {
  billingEventDecision,
  planFitsAccount,
  planFromWhopPlan,
  verifyWhopSignature,
  whopMembershipStatus,
  whopRequest,
} from "@/lib/billing";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/types";

/**
 * Whop webhook handler.
 *
 * Verification: Whop signs every delivery with Standard Webhooks, keyed on the
 * literal `ws_…` secret (`verifyWhopSignature`). An unsigned or wrongly signed
 * POST never reaches the account update below.
 *
 * Events, and what each one means for the account:
 *
 * - `payment.succeeded` — a first purchase or a renewal was paid: active.
 * - `membership.activated` / `.updated` / `.deactivated` /
 *   `.cancel_at_period_end_changed` — the subscription's lifecycle, which
 *   carries the renewal date and the end of a canceled plan.
 * - `refund.created` / `refund.updated` — once a refund has succeeded, the
 *   purchase it refunds is canceled. A refund names only its payment, so the
 *   payment is read back from the API to find the account and the plan.
 *
 * User matching: the checkout carries the buyer's account id in
 * `metadata.userId`, and Whop copies it onto the payment and the membership.
 * Email is only a last resort, and only payments carry one.
 *
 * Every purchase is tracked by its membership id (`mem_…`), so a renewal, a
 * cancellation and a refund all update the same row the first payment wrote.
 *
 * Gate: returns 503 until WHOP_WEBHOOK_SECRET is set.
 */

/*
 * Whop sends the same object in two shapes. Webhook payloads carry flat ids
 * (`variant_id`, `membership_id`, `payment_id`), as the OpenAPI spec says; the
 * REST API, even pinned to the same date, nests them (`plan: { id }`,
 * `membership: { id }`, `plan_id`, `payment: { id }`). Seen on 2026-11-05 in a
 * real sandbox purchase and refund. Every field is read both ways below.
 */

type WhopPayment = {
  id: string;
  substatus?: string | null;
  metadata?: Record<string, unknown> | null;
  membership_id?: string | null;
  membership?: { id?: string | null } | null;
  variant_id?: string | null;
  plan?: { id?: string | null } | null;
  customer_email?: string | null;
  user?: { email?: string | null } | null;
  paid_at?: string | null;
  updated_at?: string | null;
};

type WhopMembership = {
  id: string;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  variant_id?: string | null;
  plan_id?: string | null;
  plan?: { id?: string | null } | null;
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
  updated_at?: string | null;
};

type WhopRefund = {
  id: string;
  status?: string | null;
  payment_id?: string | null;
  payment?: { id?: string | null } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function paymentPlanId(payment: WhopPayment): string | null {
  return payment.variant_id ?? payment.plan?.id ?? null;
}

function paymentMembershipId(payment: WhopPayment): string | null {
  return payment.membership_id ?? payment.membership?.id ?? null;
}

function paymentEmail(payment: WhopPayment): string | null {
  return (payment.customer_email ?? payment.user?.email)?.trim().toLowerCase() || null;
}

type Resolution = {
  userId: string | null;
  planId: string | null;
  externalId: string | null;
  status: SubscriptionStatus;
  /** `undefined` leaves the stored renewal date alone (a payment does not know it). */
  renewsAt: string | null | undefined;
  /** When Whop last changed the object: orders the deliveries. */
  eventAt: Date | null;
};

function asMetadataUserId(metadata: Record<string, unknown> | undefined | null): string | null {
  const value = metadata?.userId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Replays are pointless beyond this, and Whop's own verifiers use the same window. */
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export async function POST(request: Request) {
  const secret = env.whopWebhookSecret;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const webhookId = request.headers.get("webhook-id") ?? "";
  const webhookTimestamp = request.headers.get("webhook-timestamp") ?? "";
  const webhookSignature = request.headers.get("webhook-signature") ?? "";

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return NextResponse.json({ error: "Missing signature headers." }, { status: 400 });
  }

  const sentAt = Number(webhookTimestamp);
  if (!Number.isFinite(sentAt) || Math.abs(Date.now() / 1000 - sentAt) > TIMESTAMP_TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "Stale or invalid timestamp." }, { status: 403 });
  }

  if (
    !verifyWhopSignature({
      secret,
      id: webhookId,
      timestamp: webhookTimestamp,
      body: raw,
      signatureHeader: webhookSignature,
    })
  ) {
    // Never log the secret. Its length and ends are enough to spot a truncated
    // or mis-pasted copy against what the Whop dashboard shows.
    console.error("[whop-webhook] signature rejected", {
      secretLength: secret.length,
      secretHead: secret.slice(0, 5),
      secretTail: secret.slice(-4),
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 403 });
  }

  let event: { type?: string; data?: unknown };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const type = event.type ?? "unknown";

  // Low-volume endpoint, and knowing which events actually arrive is the only
  // way to tell "handled" apart from "silently ignored" after the fact.
  console.log("[whop-webhook] received", type);

  // ── Map the event onto a single account update ───────────────────────────
  let resolved: Resolution;
  let email: string | null = null;

  switch (type) {
    case "payment.succeeded": {
      const payment = event.data as WhopPayment;
      email = paymentEmail(payment);
      resolved = {
        userId: asMetadataUserId(payment.metadata),
        planId: paymentPlanId(payment),
        externalId: paymentMembershipId(payment) ?? payment.id,
        status: "active",
        renewsAt: undefined,
        eventAt: asDate(payment.paid_at) ?? asDate(payment.updated_at),
      };
      break;
    }
    case "membership.activated":
    case "membership.updated":
    case "membership.deactivated":
    case "membership.cancel_at_period_end_changed": {
      const membership = event.data as WhopMembership;
      const status = whopMembershipStatus(membership.status);
      const renewing = (status === "active" || status === "trialing") && !membership.cancel_at_period_end;
      resolved = {
        userId: asMetadataUserId(membership.metadata),
        planId: membership.variant_id ?? membership.plan_id ?? membership.plan?.id ?? null,
        externalId: membership.id,
        status,
        // A membership set to cancel keeps access until the period ends, but
        // we only store a renewal date while it is still going to renew.
        renewsAt: renewing ? (membership.current_period_end ?? null) : null,
        eventAt: asDate(membership.updated_at),
      };
      break;
    }
    case "refund.created":
    case "refund.updated": {
      const refund = event.data as WhopRefund;
      const paymentId = refund.payment_id ?? refund.payment?.id ?? null;
      if (refund.status !== "succeeded" || !paymentId) {
        console.log("[whop-webhook] refund not acted on", { refundId: refund.id, status: refund.status, paymentId });
        return NextResponse.json({ received: true, event: type, note: `refund ${refund.status ?? "unknown"}` });
      }
      const payment = await whopRequest<WhopPayment>(`/payments/${encodeURIComponent(paymentId)}`);
      if (payment.substatus === "partially_refunded") {
        // A goodwill partial refund is not a cancellation; log it for a human.
        console.log("[whop-webhook] partial refund left the account alone", { paymentId: payment.id });
        return NextResponse.json({ received: true, event: type, note: "partial refund" });
      }
      email = paymentEmail(payment);
      resolved = {
        userId: asMetadataUserId(payment.metadata),
        planId: paymentPlanId(payment),
        externalId: paymentMembershipId(payment) ?? payment.id,
        status: "canceled",
        renewsAt: null,
        eventAt: asDate(refund.updated_at) ?? asDate(refund.created_at) ?? new Date(),
      };
      break;
    }
    default:
      // Everything else needs no account change — acknowledge so Whop stops retrying.
      return NextResponse.json({ received: true, event: type, note: "ignored" });
  }

  const planInfo = planFromWhopPlan(resolved.planId);

  // One Event is a one-time purchase: its membership is not a subscription, so
  // only a payment or a refund may change it. A membership event may still
  // activate it, in case the payment delivery was lost.
  if (type.startsWith("membership.") && planInfo?.plan === "couple" && resolved.status !== "active") {
    return NextResponse.json({ received: true, event: type, note: "one-time membership change ignored" });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client unavailable." }, { status: 500 });
  }

  // ── Resolve the account: metadata first, email as fallback ───────────────
  type AccountRow = {
    id: string;
    account_type: string | null;
    subscription_event_at: string | null;
    subscription_external_id: string | null;
  };
  const accountColumns = "id, account_type, subscription_event_at, subscription_external_id";
  let account: AccountRow | null = null;
  if (resolved.userId) {
    const { data } = await admin.from("users").select(accountColumns).eq("id", resolved.userId).maybeSingle();
    account = (data as AccountRow | null) ?? null;
  }
  if (!account && email) {
    const { data } = await admin.from("users").select(accountColumns).eq("email", email).maybeSingle();
    account = (data as AccountRow | null) ?? null;
  }

  if (!account) {
    // Nothing to activate. Acknowledge (a 4xx would make Whop retry for days)
    // but log it — a paid purchase with no account is worth a manual look.
    console.error("[whop-webhook] no matching account", { event: type, externalId: resolved.externalId });
    return NextResponse.json({ received: true, event: type, note: "user not found" });
  }

  if (!planFitsAccount(planInfo?.plan, account.account_type)) {
    // A plan this account type cannot hold, or one we do not sell. Leave the
    // account alone; acknowledge so Whop stops retrying, and log for a refund.
    console.error("[whop-webhook] plan does not fit the account", {
      event: type,
      userId: account.id,
      accountType: account.account_type,
      plan: planInfo?.plan ?? "unknown",
      externalId: resolved.externalId,
    });
    return NextResponse.json({ received: true, event: type, note: "plan does not fit account" });
  }

  const decision = billingEventDecision({
    eventAt: resolved.eventAt,
    lastAppliedAt: account.subscription_event_at,
    status: resolved.status,
    externalId: resolved.externalId,
    currentExternalId: account.subscription_external_id,
  });
  if (decision !== "apply") {
    console.log("[whop-webhook] not applied", { event: type, userId: account.id, decision, externalId: resolved.externalId });
    return NextResponse.json({ received: true, event: type, note: decision });
  }

  const update: Record<string, unknown> = {
    subscription_provider: "whop",
    subscription_external_id: resolved.externalId,
    subscription_status: resolved.status,
    subscription_event_at: (resolved.eventAt ?? new Date()).toISOString(),
  };
  if (resolved.renewsAt !== undefined) update.subscription_renews_at = resolved.renewsAt;

  // Photographer plans carry a feature tier; the couple one-time purchase does
  // not — the couple account type already gates the right feature set.
  if (resolved.status !== "canceled" && (planInfo?.plan === "solo" || planInfo?.plan === "pro")) {
    update.plan_tier = planInfo.plan;
  }

  const { error: updateError } = await admin.from("users").update(update).eq("id", account.id);
  if (updateError) {
    console.error("[whop-webhook] account update failed", {
      event: type,
      userId: account.id,
      message: updateError.message,
      details: updateError.details,
    });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    event: type,
    plan: planInfo?.plan ?? "unknown",
    status: resolved.status,
  });
}
