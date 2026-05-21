import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { EventCreateForm } from "@/components/event-create-form";
import { SetupNotice } from "@/components/setup-notice";
import { normalizeAccountType } from "@/lib/account";
import { getAccountTypeForUser, getRequiredUser } from "@/lib/auth";
import { createEventAction } from "@/lib/actions";
import { hasSupabase } from "@/lib/env";
import { listOwnerEvents } from "@/lib/events";

export default async function NewEventPage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string }>;
}) {
  if (hasSupabase) {
    const { user, supabase } = await getRequiredUser();
    const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);
    if (accountType === "couple") {
      const existingEvents = await listOwnerEvents(user.id);
      if (existingEvents.length > 0) {
        redirect(`/dashboard/events/${existingEvents[0].slug}`);
      }
    }
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const intent = normalizeAccountType(resolvedSearchParams?.intent);
  const isCouple = intent === "couple";

  return (
    <main className="pb-16">
      <DashboardHeader
        title={isCouple ? "Create your wedding event" : "Create event"}
        eyebrow={isCouple ? "Set up one private event before you share the QR code." : "Design the rules before guests arrive."}
      />
      <section className="shell">
        {hasSupabase ? (
          <EventCreateForm
            action={createEventAction}
            intent={intent}
          />
        ) : <SetupNotice />}
      </section>
    </main>
  );
}
