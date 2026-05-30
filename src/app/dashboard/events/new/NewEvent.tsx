import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { EventCreateForm } from "@/components/event-create-form";
import { SetupNotice } from "@/components/setup-notice";
import { normalizeAccountType } from "@/lib/account";
import { getAccountTypeForUser, getRequiredUser } from "@/lib/auth";
import { createEventAction } from "@/lib/actions";
import { hasSupabase } from "@/lib/env";
import { listOwnerEvents } from "@/lib/events";
import { getDictionary, localePrefix, type Locale } from "@/lib/i18n/index";

export async function NewEvent({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams?: { intent?: string };
}) {
  const d = getDictionary(locale).dashboard;
  const prefix = localePrefix(locale);

  if (hasSupabase) {
    const { user, supabase } = await getRequiredUser();
    const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);
    if (accountType === "couple") {
      const existingEvents = await listOwnerEvents(user.id);
      if (existingEvents.length > 0) {
        redirect(`${prefix}/dashboard/couple`);
      }
    }
  }

  const intent = normalizeAccountType(searchParams?.intent);
  const isCouple = intent === "couple";

  return (
    <main className="pb-16">
      <DashboardHeader
        title={isCouple ? d.create.titleCouple : d.create.titlePhotographer}
        eyebrow={isCouple ? d.create.eyebrowCouple : d.create.eyebrowPhotographer}
        strings={d.header}
        profileHref={`${prefix}/dashboard/profile`}
      />
      <section className="shell">
        {hasSupabase ? (
          <EventCreateForm action={createEventAction} intent={intent} />
        ) : (
          <SetupNotice />
        )}
      </section>
    </main>
  );
}
