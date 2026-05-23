import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRecord } from "@/lib/types";
import { AdminUsersTable } from "./admin-users-table";

async function getAllUsers() {
  const admin = createSupabaseAdminClient();
  if (!admin) return [];

  const { data } = await admin
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as UserRecord[];
}

export default async function AdminUsersPage() {
  const users = await getAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-moss)]">Management</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--color-ink)]">
          Users
          <span className="ml-2.5 text-base font-normal text-black/35">{users.length}</span>
        </h1>
      </div>
      <AdminUsersTable users={users} />
    </div>
  );
}
