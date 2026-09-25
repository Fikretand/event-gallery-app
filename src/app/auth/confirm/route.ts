import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where every link in an auth email lands.
 *
 * Two ways in. `token_hash` + `type` is what our email templates send
 * (supabase/templates/): it is verified with verifyOtp, which needs nothing from
 * the browser, so it works when someone signs up on a laptop and opens the mail
 * on their phone. `code` is the PKCE fallback for Supabase's default templates,
 * and only works in the browser that started the flow.
 *
 * Before this, signup confirmations could only arrive as `code` — so the common
 * cross-device case failed — and a failure of any kind was sent to the
 * forgot-password page with a "recovery" error, which made no sense to someone
 * who had just registered.
 */

const OTP_TYPES: readonly EmailOtpType[] = ["email", "signup", "recovery", "invite", "magiclink", "email_change"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const type = OTP_TYPES.find((candidate) => candidate === rawType);
  const next = url.searchParams.get("next");

  const isRecovery = type === "recovery" || next === "/reset-password";
  const failure = isRecovery ? "/forgot-password?error=recovery" : "/login?error=confirm";
  const success = safeNextPath(next, isRecovery ? "/reset-password" : "/dashboard");

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect(failure);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    redirect(error ? failure : success);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    redirect(error ? failure : success);
  }

  redirect(failure);
}
