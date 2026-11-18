import { NextResponse } from "next/server";

import { locales, type Locale } from "@/lib/i18n/index";
import { accountForEmail } from "@/lib/leads";
import { normalizeLeadCode } from "@/lib/lead-sequence";
import { OFFER_COOKIE, OFFER_COOKIE_OPTIONS } from "@/lib/offer-cookie";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The button in every lead email. Remembers the code in a cookie and sends
 * the person where they buy:
 *
 * - signed in: the billing page, discount applied;
 * - the code's address has a one-event account: the login page (sign-in and
 *   signup both go on to the billing page while the cookie is set);
 * - no account yet: one-event signup with the code's address filled in, so
 *   the account is made with the address the code belongs to;
 * - a photographer or already-paid account: signup without the address,
 *   since the email told them to use another one.
 *
 * The code is checked again at checkout, so a made-up one here only ever
 * earns a "code doesn't exist" there. The address is put in the signup URL
 * only for a real code's own lead; that page is noindex and never measured.
 */
export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = locales.includes(raw as Locale) ? (raw as Locale) : "bs";
  const url = new URL(request.url);
  const code = normalizeLeadCode(url.searchParams.get("kod") ?? "");

  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  let target = `/${locale}/signup?intent=couple&offer=1`;
  if (user) {
    target = `/${locale}/dashboard/billing`;
  } else if (code) {
    const admin = createSupabaseAdminClient();
    const { data: lead } = admin ? await admin.from("leads").select("email").eq("code", code).maybeSingle() : { data: null };
    const email = (lead?.email as string | undefined) ?? null;
    if (email) {
      const account = await accountForEmail(email);
      if (account === "couple") target = `/${locale}/login?offer=1&email=${encodeURIComponent(email)}`;
      else if (account === "none") target = `/${locale}/signup?intent=couple&offer=1&email=${encodeURIComponent(email)}`;
    }
  }

  const response = NextResponse.redirect(new URL(target, url.origin));
  if (code) response.cookies.set(OFFER_COOKIE, code, OFFER_COOKIE_OPTIONS);
  return response;
}
