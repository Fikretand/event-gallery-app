import Link from "next/link";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTrialState, countUserMediaFiles, getAccountUsage } from "@/lib/events";
import { formatBytes } from "@/lib/utils";
import type { UserRecord } from "@/lib/types";

async function getDashboardData() {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  const [{ data: users }, { data: events }] = await Promise.all([
    admin.from("users").select("*").order("created_at", { ascending: false }),
    admin.from("events").select("id, title, owner_user_id, status, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  const allUsers = (users ?? []) as UserRecord[];
  const recentUsers = allUsers.slice(0, 6);

  // Stats
  const totalUsers = allUsers.length;
  const proUsers = allUsers.filter((u) => u.plan_tier === "pro").length;
  const admins = allUsers.filter((u) => u.role === "admin").length;
  const trialUsers = allUsers.filter((u) => {
    if (u.plan_tier === "pro" || u.role === "admin") return false;
    const daysOld = (Date.now() - new Date(u.created_at).getTime()) / 86400000;
    return daysOld < 7;
  }).length;

  // Total storage across all users (sample top-10 to avoid slow load)
  const storagePromises = allUsers.slice(0, 10).map((u) => getAccountUsage(u.id).then((x) => x.liveUsedStorageBytes));
  const storageValues = await Promise.all(storagePromises);
  const sampledStorage = storageValues.reduce((a, b) => a + b, 0);

  return { allUsers, recentUsers, totalUsers, proUsers, admins, trialUsers, sampledStorage, recentEvents: events ?? [] };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  if (!data) return <p className="text-sm text-black/50">Could not load admin data.</p>;

  const { recentUsers, totalUsers, proUsers, admins, trialUsers, sampledStorage, recentEvents } = data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total users" value={totalUsers} icon="👥" />
        <StatCard label="Pro plan" value={proUsers} icon="⭐" accent />
        <StatCard label="On trial" value={trialUsers} icon="⏳" />
        <StatCard label="Admins" value={admins} icon="⚡" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Recent users */}
        <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
          <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Recent signups</h2>
            <Link href="/admin/users" className="text-xs font-medium text-[var(--color-moss)] hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-black/5">
            {recentUsers.map((u) => {
              const initials = (u.full_name ?? u.email)
                .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
              const daysOld = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000);
              return (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="flex items-center gap-3.5 px-5 py-3.5 transition hover:bg-black/[0.025]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-xs font-bold text-[var(--color-ink)]">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                      {u.full_name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-black/45">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.plan_tier === "pro" ? "bg-amber-100 text-amber-700" : "bg-black/6 text-black/50"}`}>
                      {u.plan_tier}
                    </span>
                    <span className="text-xs text-black/35">
                      {daysOld === 0 ? "Today" : `${daysOld}d ago`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent events */}
        <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
          <div className="border-b border-black/8 px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Recent events</h2>
          </div>
          <div className="divide-y divide-black/5">
            {recentEvents.map((ev) => {
              const created = new Date(ev.created_at);
              return (
                <div key={ev.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-sm">
                    🎉
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink)]">{ev.title}</p>
                    <p className="text-xs text-black/40">
                      {created.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                    ev.status === "active" ? "bg-emerald-100 text-emerald-700"
                    : ev.status === "archived" ? "bg-black/8 text-black/50"
                    : "bg-black/6 text-black/45"
                  }`}>
                    {ev.status}
                  </span>
                </div>
              );
            })}
            {recentEvents.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-black/35">No events yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border px-5 py-5 ${accent ? "border-amber-200/60 bg-[linear-gradient(135deg,rgba(255,248,230,0.9),rgba(255,237,190,0.6))]" : "border-black/8 bg-white"}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{label}</p>
        <span className="text-lg leading-none">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-[var(--color-ink)]">{value}</p>
    </div>
  );
}
