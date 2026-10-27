import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRecord } from "@/lib/types";
import { AdminUsersTable } from "./admin-users-table";
import { requireAdminPage } from "@/lib/admin-guard";

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
  await requireAdminPage();
  const users = await getAllUsers();

  return (
    <div className="space-y-[var(--space-lg)]">
      <h1 className="app-title flex items-baseline gap-3 text-ink">
        Users
        <span className="num font-body text-base font-normal text-muted">{users.length}</span>
      </h1>
      <AdminUsersTable users={users} />
    </div>
  );
}
