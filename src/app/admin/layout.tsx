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
        {/* pt-14 offsets the fixed mobile top bar; lg:pt-0 removes it on desktop */}
        <div className="flex-1 p-5 pt-[calc(3.5rem+1.25rem)] lg:p-8 lg:pt-8">{children}</div>
      </div>
    </div>
  );
}
