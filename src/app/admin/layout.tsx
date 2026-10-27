import type { Metadata } from "next";

import { requireAdminPage } from "@/lib/admin-guard";
import { privateMetadata } from "@/lib/seo";
import { AdminSidebar } from "./admin-sidebar";

/** The admin panel has no business in a search index. */
export const metadata: Metadata = privateMetadata();

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  return (
    <div className="app flex min-h-screen bg-paper">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* pt-14 offsets the fixed mobile top bar; lg:pt-0 removes it on desktop */}
        <div className="flex-1 p-5 pt-[calc(3.5rem+1.25rem)] lg:p-8 lg:pt-8">{children}</div>
      </div>
    </div>
  );
}
