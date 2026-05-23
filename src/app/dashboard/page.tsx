import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardEventList } from "@/components/dashboard-event-list";
import { SetupNotice } from "@/components/setup-notice";
import { Panel } from "@/components/ui/panel";
import { resolveAccountRedirect } from "@/lib/account";
import { getAccountTypeForUser, getRequiredUser, getUserProfile } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";
import {
  computeTrialState,
  countUserMediaFiles,
  getAccountUsage,
  getEventCoverMap,
  getEventLifecycleStatus,
  listOwnerEvents,
} from "@/lib/events";
import type { TrialState } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ deleted?: string }>;
}) {
  if (!hasSupabase) {
    return (
      <main className="py-8">
        <DashboardHeader title="Dashboard" eyebrow="Add project credentials to activate live data." />
        <SetupNotice />
      </main>
    );
  }

  const { user, supabase } = await getRequiredUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const events = await listOwnerEvents(user.id);
  const accountType = await getAccountTypeForUser(supabase, user.id, user.user_metadata?.account_type);

  if (accountType === "couple") {
    redirect(resolveAccountRedirect(accountType, { eventSlug: events[0]?.slug ?? null }));
  }

  const [coverMap, usage, profile, photosUsed] = await Promise.all([
    getEventCoverMap(events),
    getAccountUsage(user.id),
    getUserProfile(supabase, user.id),
    countUserMediaFiles(user.id),
  ]);

  const planLabel = usage.activeEventLimit === 25 ? "Pro" : "Solo";
  const trial = profile
    ? computeTrialState(profile.created_at, profile.plan_tier, photosUsed)
    : null;

  return (
    <main className="pb-16">
      <DashboardHeader
        title="Your events"
        eyebrow="Private galleries, guest uploads, and delivery links"
        action={
          <Link
            href="/dashboard/events/new"
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            New event
          </Link>
        }
      />

      <section className="shell grid gap-4">
        {resolvedSearchParams?.deleted === "1" ? (
          <div className="rounded-2xl bg-[#eef9f0] px-4 py-3 text-sm text-[#1f6b35]">
            Event permanently deleted. Your storage numbers now reflect only what is still stored in the account.
          </div>
        ) : null}

        {trial && <TrialBanner trial={trial} />}

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr_1fr]">
          <UsageCard
            label="Storage used"
            used={usage.liveUsedStorageBytes}
            limit={usage.liveStorageLimitBytes}
            accentClass="bg-[linear-gradient(135deg,rgba(225,246,232,0.98),rgba(242,250,244,0.94))]"
            progressClass="bg-[linear-gradient(90deg,#1f6b42,#4da36e)]"
            meta={`${formatBytes(usage.liveAvailableStorageBytes)} remaining`}
          />
          <CountCard
            label="Events"
            value={`${usage.activeEvents} / ${usage.activeEventLimit}`}
            accentClass="bg-[linear-gradient(135deg,rgba(237,243,255,0.98),rgba(247,249,255,0.95))]"
            note={`${usage.remainingEventSlots} active slots left`}
          >
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/8">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#345b9e,#5b84cb)]"
                style={{ width: `${Math.min((usage.activeEvents / usage.activeEventLimit) * 100, 100)}%` }}
              />
            </div>
          </CountCard>
          <CountCard
            label="Plan"
            value={planLabel}
            accentClass="bg-[linear-gradient(135deg,rgba(255,248,240,0.98),rgba(248,242,232,0.95))]"
            note={
              planLabel === "Pro"
                ? "25 active events, 500 GB storage"
                : "5 active events, 100 GB storage"
            }
          >
            {planLabel === "Solo" ? (
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/18"
              >
                Upgrade to Pro →
              </Link>
            ) : null}
          </CountCard>
        </div>

        {events.length === 0 ? (
          <Panel className="bg-white/90">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">No events yet</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">
              Create your first event to generate guest upload links, a QR code, and a private gallery.
            </p>
          </Panel>
        ) : (
          <DashboardEventList
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

function UsageCard({
  label,
  used,
  limit,
  meta,
  accentClass,
  progressClass,
}: {
  label: string;
  used: number;
  limit: number;
  meta: string;
  accentClass: string;
  progressClass: string;
}) {
  const ratio = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  return (
    <Panel className={cn("overflow-hidden", accentClass)}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{label}</p>
      <p className="mt-4 text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
        {formatBytes(used)}
        <span className="ml-2 text-lg font-medium text-black/45">/ {formatBytes(limit)}</span>
      </p>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-black/8">
        <div className={cn("h-full rounded-full", progressClass)} style={{ width: `${ratio}%` }} />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-black/58">{meta}</span>
        <span className="font-semibold text-[var(--color-ink)]">{Math.round(ratio)}%</span>
      </div>
    </Panel>
  );
}

function CountCard({
  label,
  value,
  note,
  accentClass,
  children,
}: {
  label: string;
  value: string;
  note: string;
  accentClass: string;
  children?: React.ReactNode;
}) {
  return (
    <Panel className={cn("overflow-hidden", accentClass)}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--color-ink)]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-black/60">{note}</p>
      {children}
    </Panel>
  );
}

function TrialBanner({ trial }: { trial: TrialState }) {
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
          <span className="mt-0.5 text-lg leading-none">
            {isExpired ? "⏰" : "🎉"}
          </span>
          <div>
            <p className={cn("text-sm font-semibold", isExpired ? "text-[#8b1a1a]" : "text-[var(--color-ink)]")}>
              {isExpired
                ? "Your free trial has expired"
                : `Free trial — ${trial.daysLeft} day${trial.daysLeft === 1 ? "" : "s"} remaining`}
            </p>
            <p className={cn("mt-0.5 text-xs", isExpired ? "text-[#b03030]/80" : "text-black/58")}>
              {isExpired
                ? "Upgrade to keep uploading and managing your events."
                : `${trial.photosUsed} / ${trial.photosLimit} photos used · Upgrade to remove all limits`}
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
          href="/pricing"
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
            isExpired
              ? "bg-[#8b1a1a] text-white hover:bg-[#6e1515]"
              : "bg-[var(--color-ink)] text-white hover:bg-[var(--color-ink)]/85",
          )}
        >
          Upgrade plan →
        </Link>
      </div>
    </div>
  );
}
