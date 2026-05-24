import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { planFromVariant } from "@/lib/billing";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/types";

/**
 * LemonSqueezy webhook. Dormant until LEMONSQUEEZY_WEBHOOK_SECRET is set.
 * Verifies the HMAC signature, then maps subscription events onto the user's
 * plan_tier + subscription_status so paid accounts skip the free-trial limits.
 */
export async function POST(request: Request) {
  const secret = env.lemonSqueezyWebhookSecret;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  // Verify HMAC-SHA256 of the raw body
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const p = payload as {
    meta?: { event_name?: string; custom_data?: { user_id?: string; plan?: string } };
    data?: { attributes?: Record<string, unknown> };
  };

  const eventName = p.meta?.event_name ?? "";
  const userId = p.meta?.custom_data?.user_id;
  const attrs = p.data?.attributes ?? {};

  if (!userId) {
    // Nothing to map this event to — acknowledge so LemonSqueezy stops retrying.
    return NextResponse.json({ received: true, note: "no user_id" });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client unavailable." }, { status: 500 });
  }

  // Map provider status → our SubscriptionStatus
  const providerStatus = String(attrs.status ?? "");
  const statusMap: Record<string, SubscriptionStatus> = {
    active: "active",
    on_trial: "trialing",
    past_due: "past_due",
    paused: "past_due",
    unpaid: "past_due",
    cancelled: "canceled",
    expired: "canceled",
  };
  const subscription_status: SubscriptionStatus = statusMap[providerStatus] ?? null;

  // Resolve plan from the purchased variant (fall back to custom_data.plan)
  const variantId = attrs.variant_id != null ? String(attrs.variant_id) : "";
  const plan = planFromVariant(variantId) ?? (p.meta?.custom_data?.plan as "solo" | "pro" | undefined);

  const update: Record<string, unknown> = {
    subscription_status,
    subscription_provider: "lemonsqueezy",
    subscription_external_id: p.data && "id" in p.data ? String((p.data as { id?: unknown }).id ?? "") : null,
    subscription_renews_at: (attrs.renews_at as string | null) ?? null,
  };

  // Only move plan_tier on active/trialing; on cancel/expire we keep their
  // current tier but clear the active flag (so trial limits resume for solo).
  if (plan && (subscription_status === "active" || subscription_status === "trialing")) {
    update.plan_tier = plan;
  }

  const { error } = await admin.from("users").update(update).eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, event: eventName });
}
