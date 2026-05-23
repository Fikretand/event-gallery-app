import { redirect } from "next/navigation";

import { getRequiredUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getRequiredUser();

  const admin = createSupabaseAdminClient();
  if (!admin) redirect("/dashboard");

  const { data } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--color-paper)]">
      <header className="border-b border-black/8 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-[var(--color-ink)]">Confetti</span>
            <span className="rounded-full bg-[var(--color-accent)]/12 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
              Admin
            </span>
          </div>
          <a href="/dashboard" className="text-sm text-black/50 transition hover:text-[var(--color-ink)]">
            ← Back to dashboard
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
