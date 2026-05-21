import { createBrowserClient } from "@supabase/ssr";

import { env, hasSupabase } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!hasSupabase || !env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
