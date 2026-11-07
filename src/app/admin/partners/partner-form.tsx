"use client";

import { useActionState } from "react";

import { OFFER_PLACEMENTS, PLACEMENT_LABELS, type PartnerOffer } from "@/lib/partners-shared";

type Action = (state: { error?: string } | undefined, formData: FormData) => Promise<{ error?: string } | undefined>;

/** "2026-11-07" in Sarajevo from a stored instant, for a date input. */
function dayInSarajevo(iso: string | null | undefined) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sarajevo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/**
 * One partner offer: who, what, the code, the link, the picture, the pages it
 * appears on and for how long. Dates are whole days in Sarajevo.
 */
export function PartnerForm({
  action,
  offer,
  imageUrl,
  submitLabel,
}: {
  action: Action;
  offer?: PartnerOffer | null;
  imageUrl?: string | null;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="card max-w-3xl space-y-5 p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="field-label">Partner name</span>
          <input name="partnerName" required maxLength={120} defaultValue={offer?.partner_name} placeholder="Salon vjenčanica Bijela" className="field" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="field-label">Discount code (optional)</span>
          <input name="discountCode" maxLength={60} defaultValue={offer?.discount_code ?? ""} placeholder="CONFETTI10" className="field code" />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="field-label">Headline – what the customer gets</span>
        <input name="headline" required maxLength={160} defaultValue={offer?.headline} placeholder="10% popusta na vjenčanice uz Confetti" className="field" />
      </label>

      <label className="flex flex-col gap-2">
        <span className="field-label">Text (optional)</span>
        <textarea
          name="body"
          maxLength={600}
          rows={3}
          defaultValue={offer?.body ?? ""}
          placeholder="Pokažite kod u salonu u Sarajevu ili ga upišite pri online narudžbi."
          className="field min-h-24 py-3"
        />
        <span className="field-hint">Written as customers should read it (Bosnian). Up to 600 characters.</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="field-label">Link (optional, https only)</span>
        <input name="linkUrl" type="url" maxLength={500} defaultValue={offer?.link_url ?? ""} placeholder="https://partner.ba/ponuda" className="field" />
      </label>

      <fieldset className="space-y-2">
        <legend className="field-label">Show on</legend>
        {OFFER_PLACEMENTS.map((placement) => (
          <label key={placement} className="check-row">
            <input type="checkbox" name="placements" value={placement} defaultChecked={offer ? offer.placements.includes(placement) : placement === "create_event"} className="size-4" />
            {PLACEMENT_LABELS[placement]}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-2">
          <span className="field-label">From</span>
          <input name="startsOn" type="date" defaultValue={dayInSarajevo(offer?.starts_at)} className="field" />
          <span className="field-hint">Empty: from today.</span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="field-label">Until (inclusive)</span>
          <input name="endsOn" type="date" defaultValue={dayInSarajevo(offer?.ends_at)} className="field" />
          <span className="field-hint">Empty: no end date.</span>
        </label>
        <label className="flex flex-col gap-2">
          <span className="field-label">Order</span>
          <input name="sortOrder" type="number" defaultValue={offer?.sort_order ?? 0} className="field" />
          <span className="field-hint">Lower shows first.</span>
        </label>
      </div>

      <div className="space-y-2">
        <span className="field-label block">Picture (optional)</span>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-32 w-auto rounded-[var(--radius-image)] border border-rule object-cover" />
        ) : null}
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="block text-sm text-ink-2" />
        <span className="field-hint block">JPG, PNG or WebP up to 5 MB; it is resized to 900 px.</span>
        {imageUrl ? (
          <label className="check-row">
            <input type="checkbox" name="removeImage" className="size-4" />
            Remove the picture
          </label>
        ) : null}
      </div>

      <label className="check-row">
        <input type="checkbox" name="isActive" defaultChecked={offer ? offer.is_active : true} className="size-4" />
        Active (switch off to pause without deleting)
      </label>

      {state?.error ? (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end border-t border-rule pt-5">
        <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
