import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login?error=recovery");
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect("/forgot-password?error=recovery");
    }

    redirect(next ?? "/dashboard");
  }

  if (!tokenHash || type !== "recovery") {
    redirect("/login?error=recovery");
  }

  const { error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });

  if (error) {
    redirect("/forgot-password?error=recovery");
  }

  redirect(next ?? "/reset-password");
}
