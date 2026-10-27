import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { PaymentSuccessBanner } from "@/components/payment-success-banner";
import { RetentionNotice } from "@/components/retention-notice";
import { SetupNotice } from "@/components/setup-notice";
import { AlertIcon, ExternalIcon } from "@/components/ui/icons";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/billing";
import { hasSupabase } from "@/lib/env";
import { getDictionary, localePrefix, t, type Locale, daysWord } from "@/lib/i18n/index";
import {
  computeTrialState,
  countUserMediaFiles,
  getEventLifecycleStatus,
  getRetentionAccessEndsAt,
  listOwnerEvents,
} from "@/lib/events";
import { retentionSchedule } from "@/lib/retention";
import type { TrialState } from "@/lib/types";
import { absoluteUrl, cn, formatDate } from "@/lib/utils";

export async function CoupleDashboard({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams?: { paid?: string };
}) {
  const dict = getDictionary(locale);
  const d = dict.coupleDashboard;

  if (!hasSupabase) {
    return (
      <main className="py-8">
        <DashboardHeader title={d.title} eyebrow={d.eyebrow} />
        <SetupNotice />
      </main>
    );
  }

  const { user, supabase } = await getRequiredUser();
  const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);

  if (accountType !== "couple") {
    redirect("/dashboard");
  }

  const [events, profile, photosUsed] = await Promise.all([
    listOwnerEvents(user.id),
    getUserProfile(supabase, user.id),
    countUserMediaFiles(user.id),
  ]);
  const event = events[0] ?? null;

  // Rendered in whichever of the two states below applies.
  const paymentBanner =
    searchParams?.paid === "1" ? (
      <PaymentSuccessBanner
        activated={profile ? hasActiveSubscription(profile) : false}
        planLabel={dict.dashboard.billing.oneEvent}
        strings={dict.dashboard.paymentBanner}
      />
    ) : null;

  const trial = profile
    ? computeTrialState(profile.created_at, profile.plan_tier, photosUsed, profile.role, profile.subscription_status)
    : null;

  if (event) {
    const status = getEventLifecycleStatus(event);
    const guestUploadUrl = absoluteUrl(`/upload/${event.slug}`);
    const galleryUrl = absoluteUrl(`/gallery/${event.slug}`);

    const statusLabel =
      status === "active" ? d.statusActive : status === "expired" ? d.statusExpired : d.statusDraft;

    return (
      <main className="pb-[var(--space-3xl)]">
        <DashboardHeader
          title={d.title}
          eyebrow={d.eyebrow}
          strings={dict.dashboard.header}
          profileHref={`${localePrefix(locale)}/dashboard/profile`}
          action={
            <Link
              href={`/dashboard/events/${event.slug}`}
              className="btn btn-sm btn-primary"
            >
              {d.manageEventBtn}
            </Link>
          }
        />

        <section className="shell grid gap-[var(--space-xl)]">
          {paymentBanner}
          {trial && <TrialBanner trial={trial} d={d} locale={locale} />}
          {profile ? (
            <RetentionNotice
              schedule={retentionSchedule(profile, getRetentionAccessEndsAt(event))}
              kind="couple"
              strings={dict.dashboard.retention}
              locale={locale}
              href={`${localePrefix(locale)}/dashboard/events/${event.slug}/gallery`}
              cta={dict.dashboard.retention.openGallery}
            />
          ) : null}

          {/* The event, then the three places it lives: guests, gallery, link */}
          <section className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-[var(--space-lg)]">
            <div>
              <h2 className="app-title text-ink">{event.title}</h2>
              {event.event_date && <p className="meta mt-1">{formatDate(event.event_date, locale)}</p>}
            </div>
            <span className={cn("chip font-semibold", status === "active" ? "chip-moss" : status === "expired" ? "chip-error" : "")}>
              {statusLabel}
            </span>
          </section>

          <ul className="grid gap-y-[var(--space-lg)] sm:grid-cols-3 sm:divide-x sm:divide-rule">
            <li className="sm:pr-[var(--space-lg)]">
              <h3 className="font-semibold text-ink">{d.guestUploadsTitle}</h3>
              <p className="mt-1 text-ink-2">{d.guestUploadsBody}</p>
              <Link href={`/dashboard/events/${event.slug}`} className="link mt-2 inline-flex min-h-10 items-center text-sm">
                {d.guestUploadsLink}
              </Link>
            </li>
            <li className="sm:px-[var(--space-lg)]">
              <h3 className="font-semibold text-ink">{d.galleryTitle}</h3>
              <p className="mt-1 text-ink-2">{d.galleryBody}</p>
              <a href={galleryUrl} target="_blank" rel="noopener noreferrer" className="link mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm">
                {d.galleryLink}
                <ExternalIcon className="h-4 w-4" />
              </a>
            </li>
            <li className="sm:pl-[var(--space-lg)]">
              <h3 className="font-semibold text-ink">{d.uploadLinkTitle}</h3>
              <p className="mt-1 text-ink-2">{d.uploadLinkBody}</p>
              <a href={guestUploadUrl} target="_blank" rel="noopener noreferrer" className="link mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm">
                {d.uploadLinkCta}
                <ExternalIcon className="h-4 w-4" />
              </a>
            </li>
          </ul>

          {/* Full management */}
          <section className="well flex flex-wrap items-center justify-between gap-4 p-[var(--space-lg)]">
            <div>
              <h3 className="font-semibold text-ink">{d.fullManageTitle}</h3>
              <p className="mt-1 text-ink-2">{d.fullManageBody}</p>
            </div>
            <Link href={`/dashboard/events/${event.slug}`} className="btn btn-sm btn-secondary shrink-0">
              {d.fullManageBtn}
            </Link>
          </section>
        </section>
      </main>
    );
  }

  // No event yet — welcome / empty state
  return (
    <main className="pb-[var(--space-3xl)]">
      <DashboardHeader title={d.welcomeTitle} eyebrow={d.welcomeEyebrow} strings={dict.dashboard.header} profileHref={`${localePrefix(locale)}/dashboard/profile`} />

      <section className="shell grid gap-[var(--space-xl)]">
        {paymentBanner}
        {trial && <TrialBanner trial={trial} d={d} locale={locale} />}

        <section className="well p-[var(--space-xl)]">
          <h2 className="app-title text-ink">{d.emptyTitle}</h2>
          <p className="mt-2 max-w-lg text-ink-2">{d.emptyBody}</p>
          <Link href="/dashboard/events/new?intent=couple" className="btn btn-primary mt-[var(--space-lg)]">
            {d.createEventBtn}
          </Link>
        </section>

        {/* Steps */}
        <ol className="grid gap-y-[var(--space-lg)] sm:grid-cols-3 sm:divide-x sm:divide-rule">
          {d.steps.map((step, i) => (
            <li key={step.title} className="sm:px-[var(--space-lg)] sm:first:pl-0">
              <h3 className="flex items-baseline gap-3 font-semibold text-ink">
                <span className="num font-display text-xl text-accent">{i + 1}</span>
                {step.title}
              </h3>
              <p className="mt-1 text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

type CoupleDashboardStrings = Awaited<ReturnType<typeof getDictionary>>["coupleDashboard"];

function TrialBanner({ trial, d, locale }: { trial: TrialState; d: CoupleDashboardStrings; locale: Locale }) {
  if (trial.status === "none") return null;

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
              ? d.trialExpired
              : t(d.trialActive, { days: String(trial.daysLeft), unit: daysWord(trial.daysLeft, locale) })}
          </p>
          <p className="mt-0.5">
            {isExpired
              ? d.trialExpiredBody
              : t(d.trialPhotosUsed, { used: String(trial.photosUsed), limit: String(trial.photosLimit) })}
          </p>
          {!isExpired && (
            <div className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-paper-3">
              <div
                className={cn("h-full origin-left rounded-full", nearLimit ? "bg-accent" : "bg-moss")}
                style={{ transform: `scaleX(${photoRatio / 100})` }}
              />
            </div>
          )}
        </div>
      </div>
      <Link href="/dashboard/billing" className="btn btn-sm btn-secondary shrink-0">
        {d.trialChoosePlan}
      </Link>
    </div>
  );
}
