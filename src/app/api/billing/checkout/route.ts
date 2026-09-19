import { NextResponse } from "next/server";

import {
  createCheckout,
  createPolarCheckout,
  getPayhipProductKey,
  getPolarProductId,
  hasPayments,
  hasPolar,
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

    // NEXT_PUBLIC_APP_URL wins when it is really configured. It falls back to
    // localhost, which a provider will reject as a return URL, so on a
    // deployment without it (e.g. a Vercel preview) use the request's own
    // origin instead of sending the buyer to localhost.
    const configuredBase = env.appUrl.replace(/\/$/, "");
    const requestOrigin = new URL(request.url).origin;
    const baseUrl = configuredBase.startsWith("http://localhost")
      ? requestOrigin
      : configuredBase;
    const successUrl = `${baseUrl}/dashboard/billing?success=1`;

    // ── Polar (Merchant of Record) — preferred when configured ───────────
    // Works for every plan; the buyer's account id rides along in metadata so
    // the webhook can activate the right account regardless of payment email.
    if (hasPolar) {
      const polarProductId = getPolarProductId(plan, cycle);
      if (polarProductId) {
        const url = await createPolarCheckout({
          productId: polarProductId,
          user: { id: user.id, email },
          successUrl,
        });
        return NextResponse.json({ url });
      }
      // No Polar product for this plan yet — fall through to the legacy paths.
    }

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
    const url = await createCheckout({
      plan: plan as PlanId,
      cycle,
      user: { id: user.id, email },
      redirectUrl: successUrl,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start checkout.";
    // The provider's own error (wrong environment, unknown product, bad return
    // URL) is the only thing that explains a failed checkout, and the browser
    // never sees it — log it so it lands in the deployment logs.
    console.error("[checkout] failed", {
      message,
      polarServer: env.polarServer,
      detail: error instanceof Error ? (error.cause ?? error.stack?.slice(0, 500)) : error,
    });
    const status = message.includes("NOT_CONFIGURED") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
