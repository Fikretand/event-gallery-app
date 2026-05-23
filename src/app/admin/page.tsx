import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTrialState, countUserMediaFiles, getAccountUsage, listOwnerEvents } from "@/lib/events";
import { formatBytes } from "@/lib/utils";
import type { UserRecord } from "@/lib/types";
import { AdminUserRow } from "./admin-user-row";

async function getAllUsers(): Promise<UserRecord[]> {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as UserRecord[];
}

async function getUserStats(user: UserRecord) {
  const [events, photosUsed, usage] = await Promise.all([
    listOwnerEvents(user.id),
    countUserMediaFiles(user.id),
    getAccountUsage(user.id),
  ]);
  const trial = computeTrialState(user.created_at, user.plan_tier, photosUsed, user.role);
  return {
    eventCount: events.length,
    photosUsed,
    storageUsed: usage.liveUsedStorageBytes,
    trial,
  };
}

export default async function AdminPage() {
  const users = await getAllUsers();

  // Fetch stats for all users in parallel (cap to avoid too many concurrent DB calls)
  const statsArray = await Promise.all(users.map(getUserStats));
  const rows = users.map((user, i) => ({ user, stats: statsArray[i]! }));

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const proCount = users.filter((u) => u.plan_tier === "pro").length;
  const totalStorage = statsArray.reduce((sum, s) => sum + s.storageUsed, 0);

  return (
    <div className="space-y-8">
      {/* Summary cards */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink)]">Users</h1>
        <p className="mt-1 text-sm text-black/50">Manage accounts, plans and roles.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total users" value={String(totalUsers)} />
        <StatCard label="Pro plan" value={String(proCount)} />
        <StatCard label="Admins" value={String(adminCount)} />
        <StatCard label="Total storage" value={formatBytes(totalStorage)} />
      </div>

      {/* User table */}
      <div className="overflow-hidden rounded-2xl border border-black/8 bg-white/80">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/8 bg-black/[0.025]">
                <Th>User</Th>
                <Th>Type</Th>
                <Th>Plan</Th>
                <Th>Trial</Th>
                <Th>Events</Th>
                <Th>Photos</Th>
                <Th>Storage</Th>
                <Th>Joined</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map(({ user, stats }) => (
                <AdminUserRow key={user.id} user={user} stats={stats} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-black/40">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/8 bg-white/80 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-black/45">
      {children}
    </th>
  );
}
