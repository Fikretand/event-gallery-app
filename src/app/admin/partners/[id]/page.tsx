import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminPage } from "@/lib/admin-guard";
import { updatePartnerOfferAction } from "@/lib/partner-actions";
import { getOffer, isPartnerImageKey } from "@/lib/partners";
import { createSignedDownloadUrl } from "@/lib/storage";

import { PartnerForm } from "../partner-form";

export default async function EditPartnerOfferPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) notFound();
  const imageUrl = isPartnerImageKey(offer.image_key, offer.id) ? await createSignedDownloadUrl(offer.image_key) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/partners" className="hover:text-ink">Partners</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{offer.partner_name}</span>
      </div>
      <h1 className="app-title text-ink">Edit offer</h1>
      <PartnerForm action={updatePartnerOfferAction.bind(null, offer.id)} offer={offer} imageUrl={imageUrl} submitLabel="Save changes" />
    </div>
  );
}
