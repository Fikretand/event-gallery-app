import { NextResponse } from "next/server";

import { createCheckout, hasPayments, type PlanId } from "@/lib/billing";
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
      // Dormant: provider not wired up yet. The UI shows a manual-activation
      // message; admins can activate accounts from the admin panel.
      return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const plan = body.plan as PlanId;
    const cycle = (body.cycle ?? "yearly") as BillingCycle;

    if (plan !== "solo" && plan !== "pro") {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }
    if (cycle !== "monthly" && cycle !== "yearly") {
      return NextResponse.json({ error: "Invalid billing cycle." }, { status: 400 });
    }

    const baseUrl = env.appUrl.replace(/\/$/, "");
    const url = await createCheckout({
      plan,
      cycle,
      user: { id: user.id, email: user.email ?? "" },
      redirectUrl: `${baseUrl}/dashboard/billing?success=1`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start checkout.";
    const status = message.includes("NOT_CONFIGURED") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
