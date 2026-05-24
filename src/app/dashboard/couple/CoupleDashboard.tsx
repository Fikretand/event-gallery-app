import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { SetupNotice } from "@/components/setup-notice";
import { Panel } from "@/components/ui/panel";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";
import { getDictionary, t, type Locale } from "@/lib/i18n/index";
import { computeTrialState, countUserMediaFiles, getEventLifecycleStatus, listOwnerEvents } from "@/lib/events";
import type { TrialState } from "@/lib/types";
import { absoluteUrl, cn, formatDate } from "@/lib/utils";

export async function CoupleDashboard({ locale }: { locale: Locale }) {
  const d = getDictionary(locale).coupleDashboard;

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
      <main className="pb-16">
        <DashboardHeader
          title={d.title}
          eyebrow={d.eyebrow}
          action={
            <Link
              href={`/dashboard/events/${event.slug}`}
              className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              {d.manageEventBtn}
            </Link>
          }
        />

        <section className="shell grid gap-5">
          {trial && <TrialBanner trial={trial} d={d} />}

          {/* Event card */}
          <Panel className="bg-white/92">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
                  {d.eventLabel}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
                  {event.title}
                </h2>
                {event.event_date && (
                  <p className="mt-1 text-sm text-black/55">{formatDate(event.event_date)}</p>
                )}
              </div>
              <span
                className={`mt-1 rounded-full px-3 py-1 text-xs font-semibold ${
                  status === "active"
                    ? "bg-[var(--color-moss)]/10 text-[var(--color-moss)]"
                    : status === "expired"
                      ? "bg-red-100 text-red-600"
                      : "bg-black/7 text-black/50"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </Panel>

          {/* Quick links */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel className="bg-[linear-gradient(135deg,rgba(237,250,243,0.98),rgba(220,242,230,0.90))]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                {d.guestUploadsTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-black/65">{d.guestUploadsBody}</p>
              <Link
                href={`/dashboard/events/${event.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-moss)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-moss)] transition hover:bg-[var(--color-moss)]/18"
              >
                {d.guestUploadsLink}
              </Link>
            </Panel>

            <Panel className="bg-[linear-gradient(135deg,rgba(237,243,255,0.98),rgba(225,234,255,0.90))]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                {d.galleryTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-black/65">{d.galleryBody}</p>
              <a
                href={galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#345b9e]/10 px-3 py-1.5 text-xs font-semibold text-[#345b9e] transition hover:bg-[#345b9e]/18"
              >
                {d.galleryLink}
              </a>
            </Panel>

            <Panel className="bg-[linear-gradient(135deg,rgba(255,248,240,0.98),rgba(255,237,220,0.90))]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
                {d.uploadLinkTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-black/65">{d.uploadLinkBody}</p>
              <a
                href={guestUploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/18"
              >
                {d.uploadLinkCta}
              </a>
            </Panel>
          </div>

          {/* Full management panel */}
          <Panel className="bg-white/80">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">{d.fullManageTitle}</p>
                <p className="mt-1 text-sm text-black/55">{d.fullManageBody}</p>
              </div>
              <Link
                href={`/dashboard/events/${event.slug}`}
                className="shrink-0 rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-ink)]/85"
              >
                {d.fullManageBtn}
              </Link>
            </div>
          </Panel>
        </section>
      </main>
    );
  }

  // No event yet — welcome / empty state
  return (
    <main className="pb-16">
      <DashboardHeader title={d.welcomeTitle} eyebrow={d.welcomeEyebrow} />

      <section className="shell grid gap-5">
        {trial && <TrialBanner trial={trial} d={d} />}

        <Panel className="bg-[linear-gradient(160deg,rgba(255,253,250,0.98),rgba(248,230,218,0.60))] border-[#e8d2c4]">
          <div className="mx-auto max-w-lg py-6 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--color-accent)]/10 text-3xl">
              🎉
            </div>
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)] sm:text-3xl">
              {d.emptyTitle}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-black/62">{d.emptyBody}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard/events/new?intent=couple"
                className="rounded-full bg-[var(--color-accent)] px-8 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(226,121,82,0.28)] transition hover:bg-[var(--color-accent)]/88"
              >
                {d.createEventBtn}
              </Link>
            </div>
          </div>
        </Panel>

        {/* Steps */}
        <div className="grid gap-4 sm:grid-cols-3">
          {d.steps.map((step, i) => {
            const colors = [
              "bg-[linear-gradient(135deg,rgba(237,250,243,0.98),rgba(220,242,230,0.90))]",
              "bg-[linear-gradient(135deg,rgba(237,243,255,0.98),rgba(225,234,255,0.90))]",
              "bg-[linear-gradient(135deg,rgba(255,248,240,0.98),rgba(255,237,220,0.90))]",
            ];
            return (
              <Panel key={step.title} className={colors[i]}>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-xs font-bold text-[var(--color-ink)]">
                  {i + 1}
                </span>
                <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">{step.title}</p>
                <p className="mt-2 text-sm leading-6 text-black/62">{step.body}</p>
              </Panel>
            );
          })}
        </div>
      </section>
    </main>
  );
}

type CoupleDashboardStrings = Awaited<ReturnType<typeof getDictionary>>["coupleDashboard"];

function TrialBanner({ trial, d }: { trial: TrialState; d: CoupleDashboardStrings }) {
  if (trial.status === "none") return null;

  const isExpired = trial.status === "expired";
  const photoRatio = Math.min((trial.photosUsed / trial.photosLimit) * 100, 100);
  const nearLimit = trial.photosUsed >= trial.photosLimit - 5;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border px-5 py-4",
        isExpired
          ? "border-[#f5c6c6] bg-[linear-gradient(135deg,rgba(255,240,240,0.98),rgba(255,228,228,0.92))]"
          : nearLimit
            ? "border-[#f5d6b8] bg-[linear-gradient(135deg,rgba(255,248,238,0.98),rgba(255,237,215,0.92))]"
            : "border-[#c8e0d4] bg-[linear-gradient(135deg,rgba(240,250,245,0.98),rgba(224,242,232,0.90))]",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-lg leading-none">{isExpired ? "⏰" : "🎉"}</span>
          <div>
            <p className={cn("text-sm font-semibold", isExpired ? "text-[#8b1a1a]" : "text-[var(--color-ink)]")}>
              {isExpired
                ? d.trialExpired
                : t(d.trialActive, { days: String(trial.daysLeft), s: trial.daysLeft === 1 ? "" : "s" })}
            </p>
            <p className={cn("mt-0.5 text-xs", isExpired ? "text-[#b03030]/80" : "text-black/58")}>
              {isExpired
                ? d.trialExpiredBody
                : t(d.trialPhotosUsed, { used: String(trial.photosUsed), limit: String(trial.photosLimit) })}
            </p>
            {!isExpired && (
              <div className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-black/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    nearLimit ? "bg-[var(--color-accent)]" : "bg-[var(--color-moss)]",
                  )}
                  style={{ width: `${photoRatio}%` }}
                />
              </div>
            )}
          </div>
        </div>
        <Link
          href="/dashboard/billing"
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
            isExpired
              ? "bg-[#8b1a1a] text-white hover:bg-[#6e1515]"
              : "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink)]/85",
          )}
        >
          {d.trialChoosePlan}
        </Link>
      </div>
    </div>
  );
}
