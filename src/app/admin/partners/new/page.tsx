import Link from "next/link";

import { requireAdminPage } from "@/lib/admin-guard";
import { createPartnerOfferAction } from "@/lib/partner-actions";

import { PartnerForm } from "../partner-form";

export default async function NewPartnerOfferPage() {
  await requireAdminPage();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/partners" className="hover:text-ink">Partners</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">New offer</span>
      </div>
      <h1 className="app-title text-ink">New partner offer</h1>
      <PartnerForm action={createPartnerOfferAction} submitLabel="Create offer" />
    </div>
  );
}
