import { createClient } from "@supabase/supabase-js";

import { env, hasSupabaseAdmin } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdmin || !env.supabaseUrl || !env.supabaseServiceRoleKey) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
