import type { ReactNode } from "react";
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
      {/* Illustrated banner — warms up an otherwise very plain form page. */}
      <section className="shell mb-6">
        <div className="hero-glow relative overflow-hidden rounded-[28px] border border-[var(--color-accent)]/15 px-6 py-7 shadow-[0_24px_70px_rgba(18,24,38,0.06)] sm:px-9 sm:py-9">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-1/3 h-48 w-48 rounded-full bg-[var(--color-moss)]/10 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-moss)]/25 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">
                <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                {d.create.bannerEyebrow}
              </span>
              <h2 className="font-display mt-5 text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl">
                {d.create.bannerTitle}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
                {d.create.bannerBody}
              </p>
            </div>

            {/* Floating step chips */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 lg:justify-end">
              <StepChip
                className="float-card"
                label={d.create.step1}
                tone="moss"
                icon={
                  <>
                    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
                    <path d="M8 2.5v4M16 2.5v4M3 11h18M12 15v4M10 17h4" />
                  </>
                }
              />
              <StepChip
                className="float-card-delay"
                label={d.create.step2}
                tone="accent"
                icon={
                  <>
                    <rect x="3" y="3" width="7" height="7" rx="1.4" />
                    <rect x="14" y="3" width="7" height="7" rx="1.4" />
                    <rect x="3" y="14" width="7" height="7" rx="1.4" />
                    <path d="M14 14h3v3h-3zM19 14h2v7h-4M14 19h3" />
                  </>
                }
              />
              <StepChip
                className="float-card"
                label={d.create.step3}
                tone="moss"
                icon={
                  <>
                    <rect x="3" y="6.5" width="18" height="13" rx="2.5" />
                    <path d="M8.5 6.5l1.4-2.2h4.2l1.4 2.2" />
                    <circle cx="12" cy="13" r="3.4" />
                  </>
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="shell">
        {hasSupabase ? (
          <EventCreateForm action={createEventAction} intent={intent} strings={d.create.form} />
        ) : (
          <SetupNotice />
        )}
      </section>
    </main>
  );
}

function StepChip({
  label,
  icon,
  tone,
  className,
}: {
  label: string;
  icon: ReactNode;
  tone: "moss" | "accent";
  className?: string;
}) {
  const color = tone === "accent" ? "text-[var(--color-accent)]" : "text-[var(--color-moss)]";
  return (
    <div
      className={`flex w-24 flex-col items-center gap-2 rounded-[22px] border border-black/8 bg-white/85 px-3 py-4 text-center shadow-[0_14px_36px_rgba(18,24,38,0.10)] backdrop-blur sm:w-28 ${className ?? ""}`}
    >
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-[var(--color-paper)] ${color}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <span className="text-[11px] font-semibold leading-tight text-[var(--color-ink)]">{label}</span>
    </div>
  );
}
