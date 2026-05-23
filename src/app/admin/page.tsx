import Link from "next/link";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatBytes } from "@/lib/utils";
import type { UserRecord } from "@/lib/types";

async function getDashboardData() {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;

  // Single query: all users + two aggregate queries
  const [{ data: users }, { data: events }, { data: mediaAgg }] = await Promise.all([
    admin.from("users").select("*").order("created_at", { ascending: false }),
    admin.from("events").select("id, title, owner_user_id, status, created_at")
      .order("created_at", { ascending: false }).limit(8),
    admin.from("media_files").select("size_bytes").is("deleted_at", null).neq("status", "failed"),
  ]);

  const allUsers = (users ?? []) as UserRecord[];
  const totalUsers = allUsers.length;
  const proUsers = allUsers.filter((u) => u.plan_tier === "pro").length;
  const admins = allUsers.filter((u) => u.role === "admin").length;
  const trialUsers = allUsers.filter((u) => {
    if (u.plan_tier === "pro" || u.role === "admin") return false;
    const daysOld = (Date.now() - new Date(u.created_at).getTime()) / 86400000;
    return daysOld < 7;
  }).length;
  const totalStorageBytes = (mediaAgg ?? []).reduce((s, r) => s + Number(r.size_bytes ?? 0), 0);

  return {
    recentUsers: allUsers.slice(0, 6),
    totalUsers,
    proUsers,
    admins,
    trialUsers,
    totalStorageBytes,
    recentEvents: events ?? [],
  };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  if (!data) return <p className="text-sm text-black/50">Could not load admin data.</p>;

  const { recentUsers, totalUsers, proUsers, admins, trialUsers, totalStorageBytes, recentEvents } = data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">Overview</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={totalUsers} icon="👥" />
        <StatCard label="Pro plan" value={proUsers} icon="⭐" accent />
        <StatCard label="On trial" value={trialUsers} icon="⏳" />
        <StatCard label="Total storage" value={formatBytes(totalStorageBytes)} icon="💾" isText />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        {/* Recent users */}
        <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
          <div className="flex items-center justify-between border-b border-black/8 px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Recent signups</h2>
            <Link href="/admin/users" className="text-xs font-medium text-[var(--color-moss)] hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-black/[0.05]">
            {recentUsers.map((u) => {
              const initials = (u.full_name ?? u.email).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              const daysOld = Math.floor((Date.now() - new Date(u.created_at).getTime()) / 86400000);
              return (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-black/[0.02]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper)] text-xs font-bold text-[var(--color-ink)]">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink)]">{u.full_name ?? "—"}</p>
                    <p className="truncate text-xs text-black/42">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.plan_tier === "pro" ? "bg-amber-100 text-amber-700" : "bg-black/6 text-black/50"}`}>
                      {u.plan_tier}
                    </span>
                    <span className="text-xs text-black/30">{daysOld === 0 ? "Today" : `${daysOld}d ago`}</span>
                  </div>
                </Link>
              );
            })}
            {recentUsers.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-black/35">No users yet.</p>
            )}
          </div>
        </div>

        {/* Recent events */}
        <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
          <div className="border-b border-black/8 px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--color-ink)]">Recent events</h2>
          </div>
          <div className="divide-y divide-black/[0.05]">
            {recentEvents.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/10 text-base">
                  🎉
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">{ev.title}</p>
                  <p className="text-xs text-black/38">
                    {new Date(ev.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                  ev.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-black/6 text-black/45"
                }`}>
                  {ev.status}
                </span>
              </div>
            ))}
            {recentEvents.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-black/35">No events yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  isText,
}: {
  label: string;
  value: number | string;
  icon: string;
  accent?: boolean;
  isText?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-5 py-4 ${accent ? "border-amber-200/60 bg-[linear-gradient(135deg,rgba(255,248,230,0.9),rgba(255,237,190,0.6))]" : "border-black/8 bg-white"}`}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40">{label}</p>
        <span className="text-base leading-none">{icon}</span>
      </div>
      <p className={`mt-3 font-semibold tabular-nums text-[var(--color-ink)] ${isText ? "text-xl" : "text-3xl"}`}>
        {value}
      </p>
    </div>
  );
}
