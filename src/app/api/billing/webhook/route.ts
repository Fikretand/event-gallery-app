import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { planFromPayhipProduct } from "@/lib/billing";
import { env } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Payhip webhook handler.
 * Payhip sends an application/x-www-form-urlencoded POST to this URL whenever
 * a purchase, renewal, or cancellation occurs.
 *
 * Verification: compare the `security_token` field in the payload against the
 * PAYHIP_WEBHOOK_SECRET env var (no HMAC — plain string comparison).
 *
 * User matching: look up the buyer by their `email` field in Supabase auth.
 *
 * Gate: returns 503 until PAYHIP_WEBHOOK_SECRET is set.
 */
export async function POST(request: Request) {
  const secret = env.payhipWebhookSecret;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  // Payhip sends form-encoded bodies
  const raw = await request.text();
  const params = new URLSearchParams(raw);

  // ── Verify security token ─────────────────────────────────────────────────
  const securityToken = params.get("security_token") ?? "";
  const secretBuf = Buffer.from(secret, "utf8");
  const tokenBuf = Buffer.from(securityToken, "utf8");
  const valid =
    secretBuf.length === tokenBuf.length &&
    crypto.timingSafeEqual(secretBuf, tokenBuf);

  if (!valid) {
    return NextResponse.json({ error: "Invalid security token." }, { status: 401 });
  }

  // ── Extract payload fields ────────────────────────────────────────────────
  const email = params.get("email")?.trim().toLowerCase() ?? "";
  const productId = params.get("product_id") ?? "";
  const purchaseId = params.get("purchase_id") ?? "";
  // Payhip may send a `type` field on membership/subscription events
  const eventType = params.get("type") ?? "payment_completed";

  if (!email) {
    // No email → can't match user; acknowledge so Payhip stops retrying.
    return NextResponse.json({ received: true, note: "no email" });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client unavailable." }, { status: 500 });
  }

  // ── Look up user by email in public.users ────────────────────────────────
  const { data: userData, error: userError } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (userError || !userData?.id) {
    // Buyer email doesn't match any account — acknowledge cleanly.
    return NextResponse.json({ received: true, note: "user not found" });
  }
  const userId = userData.id as string;

  // ── Determine plan from product key ──────────────────────────────────────
  const planInfo = planFromPayhipProduct(productId);

  // ── Build the update ─────────────────────────────────────────────────────
  const isCancellation =
    eventType === "subscription_cancelled" || eventType === "payment_refunded";

  const update: Record<string, unknown> = {
    subscription_provider: "payhip",
    subscription_external_id: purchaseId || null,
    subscription_status: isCancellation ? "canceled" : "active",
    // One-time purchases have no renewal date
    subscription_renews_at: null,
  };

  if (!isCancellation && planInfo) {
    // For photographer plans (solo/pro), update the plan_tier so they get the
    // right feature set. For couple one-time, plan_tier stays as-is — the
    // couple account type already gates the correct features.
    if (planInfo.plan === "solo" || planInfo.plan === "pro") {
      update.plan_tier = planInfo.plan;
    }
  }

  const { error: updateError } = await admin
    .from("users")
    .update(update)
    .eq("id", userId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ received: true, event: eventType, plan: planInfo?.plan ?? "unknown" });
}
