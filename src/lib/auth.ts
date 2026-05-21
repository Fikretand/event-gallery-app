import { redirect } from "next/navigation";

import { normalizeAccountType } from "@/lib/account";
import type { UserRecord } from "@/lib/types";
import { missingEnvMessage } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

export async function getRequiredUser() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error(missingEnvMessage());
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { user, supabase };
}

export async function getAccountTypeForUser(
  supabase: ServerSupabaseClient,
  userId: string,
  fallback?: unknown,
) {
  const { data } = await supabase.from("users").select("account_type").eq("id", userId).maybeSingle();
  return normalizeAccountType(data?.account_type ?? fallback);
}

export async function getUserProfile(
  supabase: ServerSupabaseClient,
  userId: string,
) {
  const { data } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  return (data ?? null) as UserRecord | null;
}
