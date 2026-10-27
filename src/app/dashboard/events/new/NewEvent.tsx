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
    <main className="pb-[var(--space-3xl)]">
      <DashboardHeader
        title={isCouple ? d.create.titleCouple : d.create.titlePhotographer}
        eyebrow={isCouple ? d.create.eyebrowCouple : d.create.eyebrowPhotographer}
        strings={d.header}
        profileHref={`${prefix}/dashboard/profile`}
      />
      {/* The form, with the three things that happen next beside it. */}
      <div className="shell grid gap-[var(--space-xl)] lg:grid-cols-12">
        <section className="lg:col-span-8">
          {hasSupabase ? (
            <EventCreateForm action={createEventAction} intent={intent} strings={d.create.form} />
          ) : (
            <SetupNotice />
          )}
        </section>

        <aside className="lg:col-span-4">
          <div className="well p-[var(--space-lg)] lg:sticky lg:top-6">
            <h2 className="app-section-title text-ink">{d.create.bannerTitle}</h2>
            <p className="mt-2 text-ink-2">{d.create.bannerBody}</p>
            <ol className="mt-[var(--space-lg)] space-y-3">
              {[d.create.step1, d.create.step2, d.create.step3].map((step, i) => (
                <li key={step} className="flex items-baseline gap-3 font-medium text-ink">
                  <span className="num font-display text-xl font-semibold text-accent">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}
