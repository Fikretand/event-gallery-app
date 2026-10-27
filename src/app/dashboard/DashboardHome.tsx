import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { PaymentSuccessBanner } from "@/components/payment-success-banner";
import { RetentionNotice } from "@/components/retention-notice";
import { DashboardEventList } from "@/components/dashboard-event-list";
import { SetupNotice } from "@/components/setup-notice";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/billing";
import { hasSupabase } from "@/lib/env";
import {
  computeTrialState,
  countUserMediaFiles,
  getAccountUsage,
  getEventCoverMap,
  getEventLifecycleStatus,
  listOwnerEvents,
} from "@/lib/events";
import { getDictionary, localePrefix, t, type Locale, daysWord } from "@/lib/i18n/index";
import { retentionSchedule } from "@/lib/retention";
import type { TrialState } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";
import { AlertIcon } from "@/components/ui/icons";

type DashStrings = ReturnType<typeof getDictionary>["dashboard"];

export async function DashboardHome({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams?: { deleted?: string; paid?: string };
}) {
  const d = getDictionary(locale).dashboard;
  const h = d.home;

  if (!hasSupabase) {
    return (
      <main className="py-8">
        <DashboardHeader title={h.setupTitle} eyebrow={h.setupEyebrow} strings={d.header} />
        <SetupNotice />
      </main>
    );
  }

  const { user, supabase } = await getRequiredUser();
  const events = await listOwnerEvents(user.id);
  const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);

  if (accountType === "couple") {
    // Keep the post-payment flag across the hop so the banner still shows.
    const paid = searchParams?.paid === "1" ? "?paid=1" : "";
    redirect(`${localePrefix(locale)}/dashboard/couple${paid}`);
  }

  const [coverMap, usage, profile, photosUsed] = await Promise.all([
    getEventCoverMap(events),
    getAccountUsage(user.id),
    getUserProfile(supabase, user.id),
    countUserMediaFiles(user.id),
  ]);

  const planLabel = usage.activeEventLimit === 25 ? "Pro" : "Solo";
  const trial = profile
    ? computeTrialState(profile.created_at, profile.plan_tier, photosUsed, profile.role, profile.subscription_status)
    : null;

  const prefix = localePrefix(locale);

  return (
    <main className="pb-[var(--space-3xl)]">
      <DashboardHeader
        title={h.title}
        eyebrow={h.eyebrow}
        isAdmin={profile?.role === "admin"}
        strings={d.header}
        profileHref={`${prefix}/dashboard/profile`}
        action={
          <Link
            href={`${prefix}/dashboard/events/new`}
            className="btn btn-sm btn-primary"
          >
            {h.newEvent}
          </Link>
        }
      />

      <section className="shell grid gap-[var(--space-lg)]">
        {searchParams?.paid === "1" && (
          <PaymentSuccessBanner
            activated={profile ? hasActiveSubscription(profile) : false}
            planLabel={planLabel}
            strings={d.paymentBanner}
          />
        )}
        {searchParams?.deleted === "1" ? (
          <div role="status" className="notice notice-success">{h.eventDeleted}</div>
        ) : null}

        {trial && <TrialBanner trial={trial} strings={d} prefix={prefix} locale={locale} />}
        {/* Only for photographers who never paid: their events' files go after the grace period. */}
        {profile && events.length > 0 ? (
          <RetentionNotice
            schedule={retentionSchedule(profile, null)}
            kind="trial"
            strings={d.retention}
            locale={locale}
            href={`${prefix}/dashboard/billing`}
            cta={h.choosePlan}
          />
        ) : null}

        {/* The account at a glance: three figures under one hairline. */}
        <dl className="grid border-y border-rule md:grid-cols-3 md:divide-x md:divide-rule">
          <Figure
            label={h.storageUsed}
            value={formatBytes(usage.liveUsedStorageBytes)}
            unit={`/ ${formatBytes(usage.liveStorageLimitBytes)}`}
            ratio={usage.liveStorageLimitBytes > 0 ? usage.liveUsedStorageBytes / usage.liveStorageLimitBytes : 0}
            note={t(h.remaining, { amount: formatBytes(usage.liveAvailableStorageBytes) })}
          />
          <Figure
            label={h.events}
            value={String(usage.activeEvents)}
            unit={`/ ${usage.activeEventLimit}`}
            ratio={usage.activeEventLimit > 0 ? usage.activeEvents / usage.activeEventLimit : 0}
            note={t(h.slotsLeft, { n: String(usage.remainingEventSlots) })}
          />
          <Figure label={h.plan} value={planLabel} note={planLabel === "Pro" ? h.planProDesc : h.planSoloDesc}>
            {planLabel === "Solo" ? (
              <Link href={`${prefix}/dashboard/billing`} className="link mt-2 inline-flex min-h-10 items-center text-sm">
                {h.managePlan}
              </Link>
            ) : null}
          </Figure>
        </dl>

        {events.length === 0 ? (
          <div className="well p-[var(--space-xl)]">
            <h2 className="app-section-title text-ink">{h.noEvents}</h2>
            <p className="mt-2 max-w-2xl text-ink-2">{h.noEventsBody}</p>
            <Link href={`${prefix}/dashboard/events/new`} className="btn btn-sm btn-primary mt-[var(--space-lg)]">
              {h.newEvent}
            </Link>
          </div>
        ) : (
          <DashboardEventList
            strings={d.eventList}
            locale={locale}
            prefix={localePrefix(locale)}
            events={events.map((event) => {
              const cover = event.cover_image_id ? coverMap.get(event.cover_image_id) : null;

              return {
                id: event.id,
                slug: event.slug,
                title: event.title,
                clientName: event.client_name,
                eventDate: event.event_date,
                expiresAt: event.expires_at,
                coverUrl: cover?.thumbnailUrl ?? cover?.previewUrl ?? null,
                lifecycleStatus: getEventLifecycleStatus(event),
              };
            })}
          />
        )}
      </section>
    </main>
  );
}

/** One figure of the account: its label, the number, a meter where there is a limit. */
function Figure({
  label,
  value,
  unit,
  ratio,
  note,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  ratio?: number;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col border-b border-rule py-[var(--space-lg)] last:border-b-0 md:border-b-0 md:px-[var(--space-lg)] md:first:pl-0">
      <dt className="text-sm font-medium text-ink-2">{label}</dt>
      <dd className="mt-2 flex items-baseline gap-1.5">
        <span className="num font-display text-[2rem] font-semibold leading-none text-ink">{value}</span>
        {unit ? <span className="num text-sm text-muted">{unit}</span> : null}
      </dd>
      {ratio !== undefined ? <Meter ratio={ratio} /> : null}
      <dd className="meta mt-2">{note}</dd>
      {children ? <dd>{children}</dd> : null}
    </div>
  );
}

/** A thin bar for "how much of the limit": ink, terracotta past 85%. */
function Meter({ ratio }: { ratio: number }) {
  const clamped = Math.max(0, Math.min(ratio, 1));
  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-paper-3" role="presentation">
      <div
        className={cn("h-full origin-left rounded-full", clamped > 0.85 ? "bg-accent" : "bg-ink-2")}
        style={{ transform: `scaleX(${Math.max(clamped, 0.01)})` }}
      />
    </div>
  );
}

function TrialBanner({
  trial,
  strings,
  prefix,
  locale,
}: {
  trial: TrialState;
  strings: DashStrings;
  prefix: string;
  locale: Locale;
}) {
  if (trial.status === "none") return null;

  const h = strings.home;
  const isExpired = trial.status === "expired";
  const photoRatio = Math.min((trial.photosUsed / trial.photosLimit) * 100, 100);
  const nearLimit = trial.photosUsed >= trial.photosLimit - 5;

  return (
    <div role="status" className={cn("notice flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", isExpired ? "notice-error" : nearLimit ? "notice-warning" : "notice-info")}>
      <div className="flex items-start gap-3">
        {isExpired ? <AlertIcon className="mt-0.5" /> : null}
        <div>
          <p className="font-semibold">
            {isExpired
              ? h.trialExpired
              : t(h.trialActive, { days: String(trial.daysLeft), unit: daysWord(trial.daysLeft, locale) })}
          </p>
          <p className="mt-0.5">
            {isExpired
              ? h.trialExpiredBody
              : t(h.trialActiveBody, { used: String(trial.photosUsed), limit: String(trial.photosLimit) })}
          </p>
          {!isExpired && (
            <div className="mt-2 w-48 max-w-full">
              <Meter ratio={photoRatio / 100} />
            </div>
          )}
        </div>
      </div>
      <Link href={`${prefix}/dashboard/billing`} className={cn("btn btn-sm shrink-0", "btn-secondary")}>
        {h.choosePlan}
      </Link>
    </div>
  );
}
