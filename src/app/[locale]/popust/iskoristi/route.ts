import { NextResponse } from "next/server";

import { locales, type Locale } from "@/lib/i18n/index";
import { normalizeLeadCode } from "@/lib/lead-sequence";
import { OFFER_COOKIE, OFFER_COOKIE_OPTIONS } from "@/lib/offer-cookie";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The button in every lead email. Remembers the code in a cookie and sends
 * the person where they buy: the billing page if they are signed in, signup
 * for a one-event account if not. The code is checked again at checkout, so
 * a made-up one here only ever earns a "code doesn't exist" there.
 */
export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = locales.includes(raw as Locale) ? (raw as Locale) : "bs";
  const url = new URL(request.url);
  const code = normalizeLeadCode(url.searchParams.get("kod") ?? "");

  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const target = user ? `/${locale}/dashboard/billing` : `/${locale}/signup?intent=couple`;

  const response = NextResponse.redirect(new URL(target, url.origin));
  if (code) response.cookies.set(OFFER_COOKIE, code, OFFER_COOKIE_OPTIONS);
  return response;
}
