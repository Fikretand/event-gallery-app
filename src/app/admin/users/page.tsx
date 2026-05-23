import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeTrialState, countUserMediaFiles, getAccountUsage, listOwnerEvents } from "@/lib/events";
import type { UserRecord } from "@/lib/types";
import { AdminUsersTable } from "./admin-users-table";

async function getAllUsersWithStats() {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data } = await admin.from("users").select("*").order("created_at", { ascending: false });
  const users = (data ?? []) as UserRecord[];

  const statsArray = await Promise.all(
    users.map(async (u) => {
      const [events, photosUsed, usage] = await Promise.all([
        listOwnerEvents(u.id),
        countUserMediaFiles(u.id),
        getAccountUsage(u.id),
      ]);
      const trial = computeTrialState(u.created_at, u.plan_tier, photosUsed, u.role);
      return {
        eventCount: events.length,
        photosUsed,
        storageUsed: usage.liveUsedStorageBytes,
        storageLimitBytes: usage.liveStorageLimitBytes,
        trial,
      };
    }),
  );

  return users.map((u, i) => ({ user: u, stats: statsArray[i]! }));
}

export default async function AdminUsersPage() {
  const rows = await getAllUsersWithStats();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">Management</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">
          Users
          <span className="ml-2.5 text-base font-normal text-black/35">{rows.length}</span>
        </h1>
      </div>
      <AdminUsersTable rows={rows} />
    </div>
  );
}
