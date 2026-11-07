import { NextResponse } from "next/server";

import { getOffer, offerStatus, safeOfferLink } from "@/lib/partners";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * ⚠ Unauthenticated: counts one click on a partner offer and sends the visitor
 * to the partner's link. It only ever redirects to the https link stored on a
 * live offer (never to a URL taken from the request), so it cannot be used as
 * an open redirect; anything else goes to the home page.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const home = new URL("/", request.url);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(home);

  const offer = await getOffer(id);
  const link = offer ? safeOfferLink(offer.link_url) : null;
  if (!offer || !link || offerStatus(offer) !== "live") return NextResponse.redirect(home);

  const admin = createSupabaseAdminClient();
  await admin?.rpc("increment_partner_click", { offer_id: id }).then(
    () => undefined,
    () => undefined,
  );
  return NextResponse.redirect(link, { status: 302 });
}
