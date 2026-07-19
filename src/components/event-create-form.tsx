"use client";

import { useActionState } from "react";

import { normalizeAccountType } from "@/lib/account";
import type { AccountType } from "@/lib/types";
import type { Dict } from "@/lib/i18n/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";

type FormStrings = Dict["dashboard"]["create"]["form"];

// English fallback so any call site without a `strings` prop still renders.
const DEFAULT_FORM_STRINGS: FormStrings = {
  headingPhotographer: "Create event",
  headingCouple: "Create your event",
  introPhotographer: "Set the upload rules once, then share the guest upload link and client gallery.",
  introCouple: "Set the privacy rules once, then share the guest upload link and private gallery with everyone.",
  couplePlanNote:
    "Your one-time plan includes one event, 30 days of guest uploads from your event date, and up to 90 days of private gallery access from your event date.",
  couplePlanNoteSub: "Changing the event date later updates these plan windows to follow the new event date.",
  titleLabel: "Event title",
  titlePlaceholderPhotographer: "Lejla & Amar wedding",
  titlePlaceholderCouple: "Amina & Ajdin wedding",
  clientNameLabelPhotographer: "Client name",
  clientNameLabelCouple: "Couple name",
  clientNamePlaceholderPhotographer: "Lejla and Amar",
  clientNamePlaceholderCouple: "Amina and Ajdin",
  eventDateLabel: "Event date",
  eventDateHintCouple: "Required for this plan so your upload and access windows follow the event date.",
  privateAccessTitle: "Private gallery access",
  privateAccessBody: "Managed automatically by your plan for up to 90 days from your event date.",
  expiresLabel: "Expires at",
  expiresHint: "After expiry, uploads and gallery access are blocked.",
  uploadPinLabel: "Upload PIN",
  uploadPinPlaceholder: "Optional",
  uploadPinHint: "Used only if upload PIN is enabled.",
  galleryPinLabel: "Gallery PIN",
  galleryPinPlaceholder: "Required for protected galleries",
  maxSizeLabel: "Max guest upload size (MB)",
  allowGuestUpload: "Allow guest uploads",
  allowGuestVideo: "Allow guest video uploads",
  requirePinUpload: "Require PIN for guest upload",
  requirePinGalleryPhotographer: "Require PIN for client gallery",
  requirePinGalleryCouple: "Require PIN for private gallery",
  submitPhotographer: "Create event",
  submitCouple: "Create event",
  submitting: "Creating…",
};

export function EventCreateForm({
  action,
  intent = "photographer",
  expiresAtDefault,
  expiresAtMax,
  strings = DEFAULT_FORM_STRINGS,
}: {
  action: (
    state: { error?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string } | void>;
  intent?: AccountType;
  expiresAtDefault?: string;
  expiresAtMax?: string;
  strings?: FormStrings;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const isCouple = normalizeAccountType(intent) === "couple";
  const s = strings;

  return (
    <Panel className="bg-white/90">
      <form action={formAction} className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? s.headingCouple : s.headingPhotographer}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">
            {isCouple ? s.introCouple : s.introPhotographer}
          </p>
          {isCouple ? (
            <div className="mt-4 rounded-[22px] border border-[var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(246,211,195,0.34),rgba(255,255,255,0.9))] px-4 py-3 text-sm leading-6 text-black/68">
              {s.couplePlanNote}
              <p className="mt-2 text-xs leading-5 text-black/55">{s.couplePlanNoteSub}</p>
            </div>
          ) : null}
        </div>

        <Input
          label={s.titleLabel}
          name="title"
          placeholder={isCouple ? s.titlePlaceholderCouple : s.titlePlaceholderPhotographer}
          required
        />
        <Input
          label={isCouple ? s.clientNameLabelCouple : s.clientNameLabelPhotographer}
          name="clientName"
          placeholder={isCouple ? s.clientNamePlaceholderCouple : s.clientNamePlaceholderPhotographer}
        />
        <Input
          label={s.eventDateLabel}
          name="eventDate"
          type="date"
          required={isCouple}
          hint={isCouple ? s.eventDateHintCouple : undefined}
        />
        {isCouple ? (
          <div className="rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm leading-6 text-black/65">
            <p className="font-medium text-[var(--color-ink)]">{s.privateAccessTitle}</p>
            <p className="mt-1">{s.privateAccessBody}</p>
          </div>
        ) : (
          <Input
            label={s.expiresLabel}
            name="expiresAt"
            type="datetime-local"
            defaultValue={expiresAtDefault}
            max={expiresAtMax}
            hint={s.expiresHint}
          />
        )}
        <Input
          label={s.uploadPinLabel}
          name="uploadPin"
          placeholder={s.uploadPinPlaceholder}
          hint={s.uploadPinHint}
        />
        <Input label={s.galleryPinLabel} name="galleryPin" placeholder={s.galleryPinPlaceholder} />
        <Input
          label={s.maxSizeLabel}
          name="maxGuestUploadMb"
          type="number"
          min="10"
          max="2048"
          defaultValue="250"
        />

        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="allowGuestUpload" defaultChecked className="size-4" />
          {s.allowGuestUpload}
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="allowGuestVideo" defaultChecked className="size-4" />
          {s.allowGuestVideo}
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="requirePinForUpload" className="size-4" />
          {s.requirePinUpload}
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="requirePinForGallery" defaultChecked className="size-4" />
          {isCouple ? s.requirePinGalleryCouple : s.requirePinGalleryPhotographer}
        </label>

        {state?.error ? <div className="md:col-span-2 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div> : null}

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? s.submitting : isCouple ? s.submitCouple : s.submitPhotographer}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
