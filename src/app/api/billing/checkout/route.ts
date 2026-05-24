import { NextResponse } from "next/server";

import {
  createCheckout,
  getPayhipProductKey,
  hasPayments,
  payhipCheckoutUrl,
  type CheckoutPlanId,
  type PlanId,
} from "@/lib/billing";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BillingCycle } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!hasPayments) {
      return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const plan = body.plan as CheckoutPlanId;
    const cycle = (body.cycle ?? "yearly") as BillingCycle;
    const email = user.email ?? "";

    // ── Couple: one-time Payhip purchase ─────────────────────────────────
    if (plan === "couple") {
      const productKey = env.payhipProductOneEvent;
      if (!productKey) {
        return NextResponse.json({ error: "PLAN_VARIANT_NOT_CONFIGURED" }, { status: 503 });
      }
      return NextResponse.json({ url: payhipCheckoutUrl(productKey, email) });
    }

    // ── Photographer plans ────────────────────────────────────────────────
    if (plan !== "solo" && plan !== "pro") {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }
    if (cycle !== "monthly" && cycle !== "yearly") {
      return NextResponse.json({ error: "Invalid billing cycle." }, { status: 400 });
    }

    // Prefer Payhip product if configured
    const payhipKey = getPayhipProductKey(plan as PlanId, cycle);
    if (payhipKey) {
      return NextResponse.json({ url: payhipCheckoutUrl(payhipKey, email) });
    }

    // Fallback: LemonSqueezy (dormant until configured)
    const baseUrl = env.appUrl.replace(/\/$/, "");
    const url = await createCheckout({
      plan: plan as PlanId,
      cycle,
      user: { id: user.id, email },
      redirectUrl: `${baseUrl}/dashboard/billing?success=1`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start checkout.";
    const status = message.includes("NOT_CONFIGURED") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
