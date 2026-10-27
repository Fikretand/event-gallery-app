import Link from "next/link";
import { notFound } from "next/navigation";

import { describeBilling } from "@/lib/billing-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTrialState, countUserMediaFiles, getAccountUsage, listOwnerEvents } from "@/lib/events";
import { formatBytes } from "@/lib/utils";
import type { UserRecord } from "@/lib/types";
import { UserDetailActions } from "./user-detail-actions";
import { requireAdminPage } from "@/lib/admin-guard";

async function getUserDetail(id: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const [
    { data: userData },
    events,
    photosUsed,
    usage,
  ] = await Promise.all([
    admin.from("users").select("*").eq("id", id).maybeSingle(),
    listOwnerEvents(id),
    countUserMediaFiles(id),
    getAccountUsage(id),
  ]);

  if (!userData) return null;
  const user = userData as UserRecord;
  const trial = computeTrialState(user.created_at, user.plan_tier, photosUsed, user.role, user.subscription_status);

  return { user, events, photosUsed, usage, trial };
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  const { user, events, photosUsed, usage, trial } = detail;
  const billing = describeBilling(user);

  const initials = (user.full_name ?? user.email)
    .split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const storageRatio = usage.liveStorageLimitBytes > 0
    ? Math.min((usage.liveUsedStorageBytes / usage.liveStorageLimitBytes) * 100, 100)
    : 0;

  const joinedDate = new Date(user.created_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/users" className="hover:text-ink">Users</Link>
        <span>/</span>
        <span className="text-ink">{user.full_name ?? user.email}</span>
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">

        {/* ── Left panel: Profile ── */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[var(--radius-inner)] border border-rule bg-card">
            {/* Avatar area */}
            <div className="flex flex-col items-center gap-3 bg-paper-2/50 px-6 py-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink text-xl font-semibold text-paper">
                {initials}
              </div>
              <div className="text-center">
                <p className="font-semibold text-ink">{user.full_name ?? "No name"}</p>
                <p className="mt-0.5 text-sm text-muted">{user.email}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                  user.account_type === "photographer" ? "bg-paper-2 text-ink-2" : "bg-accent-soft text-ink"
                }`}>
                  {user.account_type}
                </span>
                {user.role === "admin" && (
                  <span className="rounded-full bg-accent/12 px-3 py-1 text-xs font-semibold text-accent">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Profile details */}
            <div className="divide-y divide-rule px-5 py-2">
              <ProfileRow label="Joined" value={joinedDate} />
              {user.city && <ProfileRow label="City" value={user.city} />}
              {user.phone && <ProfileRow label="Phone" value={user.phone} />}
              {user.website_url && (
                <ProfileRow label="Website">
                  <a href={user.website_url} target="_blank" rel="noopener noreferrer"
                    className="truncate text-moss hover:underline">
                    {user.website_url.replace(/^https?:\/\//, "")}
                  </a>
                </ProfileRow>
              )}
              {user.instagram_url && <ProfileRow label="Instagram" value={user.instagram_url.replace(/^https?:\/\//, "")} />}
              <ProfileRow label="User ID">
                <span className="font-mono text-xs text-muted">{user.id.slice(0, 8)}…</span>
              </ProfileRow>
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="space-y-4">

          {/* Plan & Trial */}
          <div className="rounded-[var(--radius-inner)] border border-rule bg-card">
            <SectionHeader title="Account" />
            <div className="grid grid-cols-2 gap-px bg-paper-3 sm:grid-cols-4">
              <InfoBlock label="Plan" value={billing.plan} accent={billing.plan === "Pro"} />
              <InfoBlock
                label="Billing"
                value={billing.provider ? `${billing.status} (${billing.provider})` : billing.status}
                accent={billing.tone === "paid" || billing.tone === "admin"}
                danger={billing.tone === "overdue"}
              />
              <InfoBlock label="Role" value={user.role === "admin" ? "Admin" : "User"} accent={user.role === "admin"} />
              <InfoBlock
                label="Trial"
                value={
                  trial.status === "active"
                    ? `Active, ${trial.daysLeft}d left`
                    : trial.status === "expired"
                    ? "Expired"
                    : "None"
                }
                accent={trial.status === "expired"}
                danger={trial.status === "expired"}
              />
            </div>
          </div>

          {/* Storage & Usage */}
          <div className="rounded-[var(--radius-inner)] border border-rule bg-card">
            <SectionHeader title="Storage & Usage" />
            <div className="px-5 pb-5 pt-4">
              <div className="flex items-end justify-between text-sm">
                <span className="font-medium text-ink">{formatBytes(usage.liveUsedStorageBytes)}</span>
                <span className="text-muted">of {formatBytes(usage.liveStorageLimitBytes)}</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-paper-3">
                <div
                  className={`h-full rounded-full ${storageRatio > 85 ? "bg-error" : "bg-moss"}`}
                  style={{ width: `${storageRatio}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniStat label="Events" value={events.length} />
                <MiniStat label="Active events" value={usage.activeEvents} />
                <MiniStat label="Photos" value={photosUsed} />
              </div>
              {trial.status === "active" && (
                <div className="mt-4 rounded-[var(--radius-inner)] bg-moss-soft px-4 py-3">
                  <p className="text-xs font-semibold text-moss">
                    Trial: {trial.photosUsed} / {trial.photosLimit} photos used
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-moss-soft">
                    <div
                      className="h-full rounded-full bg-moss"
                      style={{ width: `${Math.min((trial.photosUsed / trial.photosLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Events list */}
          {events.length > 0 && (
            <div className="overflow-hidden rounded-[var(--radius-inner)] border border-rule bg-card">
              <SectionHeader title={`Events (${events.length})`} />
              <div className="divide-y divide-rule">
                {events.slice(0, 6).map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 px-5 py-3.5">
                                        <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{ev.title}</p>
                      {ev.event_date && (
                        <p className="text-xs text-muted">
                          {new Date(ev.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                      ev.status === "active" ? "bg-moss-soft text-moss"
                      : ev.status === "archived" ? "bg-paper-3 text-muted"
                      : "bg-paper-3 text-muted"
                    }`}>
                      {ev.status}
                    </span>
                  </div>
                ))}
                {events.length > 6 && (
                  <p className="px-5 py-2.5 text-xs text-muted">+{events.length - 6} more events</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <UserDetailActions user={user} />
        </div>
      </div>
    </div>
  );
}

/* ── Small helper components ── */

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-rule px-5 py-3.5">
      <p className="text-xs font-semibold text-muted">{title}</p>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children ?? <span className="text-right text-xs text-ink">{value}</span>}
    </div>
  );
}

function InfoBlock({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="bg-card px-5 py-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${danger ? "text-error" : accent ? "text-[var(--color-ink)]" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-inner)] bg-paper-2/60 px-3 py-3 text-center">
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
