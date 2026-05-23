import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getRequiredUser();

  const admin = createSupabaseAdminClient();
  if (!admin) redirect("/dashboard");

  const { data } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-[#f4f0eb]">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
