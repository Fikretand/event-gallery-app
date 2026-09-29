import { notFound } from "next/navigation";
import { cache } from "react";

import { getAccountTypeForUser, getRequiredUser } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";
import { getEventAnalytics, getOwnerEventBySlug } from "@/lib/events";

/**
 * The signed-in owner's event, looked up once per request.
 *
 * The event pages share a layout (header + menu) and each page needs the same
 * event; `cache` makes the layout and the page share one lookup instead of
 * repeating it. The event and the account type are independent, so they are
 * fetched side by side: every query is a round trip to the database, and the
 * pages used to make four of them one after another.
 */
export const getOwnerEventContext = cache(async (slug: string) => {
  if (!hasSupabase) {
    notFound();
  }

  const { user, supabase } = await getRequiredUser();
  const [event, accountType] = await Promise.all([
    getOwnerEventBySlug(user.id, slug),
    getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type),
  ]);
  if (!event) {
    notFound();
  }

  return { user, supabase, event, accountType, isCouple: accountType === "couple" };
});

/** Counts for an event, shared the same way (the menu badge and the overview both use them). */
export const getEventAnalyticsCached = cache(getEventAnalytics);
