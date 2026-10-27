import Link from "next/link";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatBytes } from "@/lib/utils";
import type { UserRecord } from "@/lib/types";
import { requireAdminPage } from "@/lib/admin-guard";

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
  // One clock read for the whole snapshot, so every derived age is consistent
  // and nothing impure runs while rendering.
  const now = Date.now();
  const totalUsers = allUsers.length;
  const proUsers = allUsers.filter((u) => u.plan_tier === "pro").length;
  const trialUsers = allUsers.filter((u) => {
    if (u.plan_tier === "pro" || u.role === "admin") return false;
    return (now - new Date(u.created_at).getTime()) / 86400000 < 7;
  }).length;
  const totalStorageBytes = (mediaAgg ?? []).reduce((s, r) => s + Number(r.size_bytes ?? 0), 0);

  return {
    recentUsers: allUsers.slice(0, 6).map((u) => ({
      ...u,
      daysOld: Math.floor((now - new Date(u.created_at).getTime()) / 86400000),
    })),
    totalUsers,
    proUsers,
    trialUsers,
    totalStorageBytes,
    recentEvents: events ?? [],
  };
}

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const data = await getDashboardData();
  if (!data) return <p className="text-sm text-muted">Could not load admin data.</p>;

  const { recentUsers, totalUsers, proUsers, trialUsers, totalStorageBytes, recentEvents } = data;

  const stats = [
    { label: "Total users", value: String(totalUsers) },
    { label: "Pro plan", value: String(proUsers) },
    { label: "On trial", value: String(trialUsers) },
    { label: "Total storage", value: formatBytes(totalStorageBytes) },
  ];

  return (
    <div className="space-y-[var(--space-xl)]">
      <h1 className="app-title text-ink">Dashboard</h1>

      {/* The figures, under one hairline */}
      <dl className="grid grid-cols-2 border-y border-rule lg:grid-cols-4 lg:divide-x lg:divide-rule">
        {stats.map((stat) => (
          <div key={stat.label} className="py-[var(--space-md)] lg:px-[var(--space-lg)] lg:first:pl-0">
            <dt className="text-sm text-ink-2">{stat.label}</dt>
            <dd className="num mt-1 font-display text-[2rem] font-semibold leading-none text-ink">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-[var(--space-xl)] xl:grid-cols-[1.4fr_1fr]">
        {/* Recent users */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="app-section-title text-ink">Recent signups</h2>
            <Link href="/admin/users" className="link text-sm">
              View all users
            </Link>
          </div>
          <ul className="mt-[var(--space-sm)] border-t border-rule">
            {recentUsers.map((u) => {
              const initials = (u.full_name ?? u.email).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
              return (
                <li key={u.id} className="border-b border-rule">
                  <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 py-3 transition-colors duration-[var(--dur-micro)] hover:bg-paper-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 text-xs font-semibold text-ink" aria-hidden="true">
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{u.full_name ?? u.email}</span>
                      <span className="block truncate text-sm text-muted">{u.email}</span>
                    </span>
                    <span className={`chip ${u.plan_tier === "pro" ? "chip-accent" : ""}`}>{u.plan_tier}</span>
                    <span className="num w-16 shrink-0 text-right text-sm text-muted">{u.daysOld === 0 ? "Today" : `${u.daysOld}d ago`}</span>
                  </Link>
                </li>
              );
            })}
            {recentUsers.length === 0 && <li className="py-8 text-sm text-muted">No users yet.</li>}
          </ul>
        </section>

        {/* Recent events */}
        <section>
          <h2 className="app-section-title text-ink">Recent events</h2>
          <ul className="mt-[var(--space-sm)] border-t border-rule">
            {recentEvents.map((ev) => (
              <li key={ev.id} className="flex items-center gap-3 border-b border-rule py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">{ev.title}</span>
                  <span className="num block text-sm text-muted">
                    {new Date(ev.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className={`chip ${ev.status === "active" ? "chip-moss" : ""}`}>{ev.status}</span>
              </li>
            ))}
            {recentEvents.length === 0 && <li className="py-8 text-sm text-muted">No events yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
