// Helpers for the user's persisted dashboard language preference
// (UserRecord.preferred_locale).

import { redirect } from "next/navigation";

import { getRequiredUser, getUserProfile } from "@/lib/auth";

import { defaultLocale, type Locale } from "./index";

/**
 * For non-locale dashboard routes (`/dashboard/...`) — read the signed-in
 * user's saved preference and, if it's a non-default locale, redirect them
 * to the corresponding `/{locale}/dashboard/...` path. Pages that already
 * include `[locale]` in the URL trust the URL and never call this helper.
 *
 * Pass the path suffix after `/dashboard` (e.g. `"/profile"`, `"/events/foo"`).
 */
export async function redirectIfPreferredLocale(suffix: string): Promise<void> {
  try {
    const { user, supabase } = await getRequiredUser();
    const profile = await getUserProfile(supabase, user.id);
    const pref = profile?.preferred_locale ?? null;
    if (pref && pref !== defaultLocale) {
      redirect(`/${pref}/dashboard${suffix}`);
    }
  } catch (err) {
    // next/navigation throws a NEXT_REDIRECT sentinel — bubble it up.
    if (isRedirectError(err)) throw err;
    // Otherwise swallow: getRequiredUser will redirect to /login when needed.
  }
}

function isRedirectError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const digest = (err as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "bs";
}
