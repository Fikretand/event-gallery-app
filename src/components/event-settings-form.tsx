"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountType, EventRecord } from "@/lib/types";
import { t, type Dict } from "@/lib/i18n/index";

export function EventSettingsForm({
  event,
  action,
  saved,
  audience = "photographer",
  expiresAtMax,
  planWindow,
  strings,
}: {
  event: EventRecord;
  action: (
    state: { error?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string } | void>;
  saved?: boolean;
  audience?: AccountType;
  expiresAtMax?: string;
  planWindow?: { uploadEndsLabel: string; accessEndsLabel: string } | null;
  strings: Dict["dashboard"]["settings"];
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const isCouple = audience === "couple";
  const s = strings;

  return (
    <form action={formAction} className="grid gap-x-[var(--space-lg)] gap-y-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="app-section-title text-ink">{s.heading}</h2>
          <p className="mt-1 max-w-2xl text-ink-2">
            {isCouple ? s.introCouple : s.introPhotographer}
          </p>
          <div className="notice notice-info mt-4">
            {s.linksNote}
          </div>
          {isCouple && planWindow ? (
            <div className="notice notice-info mt-4">
              {t(s.planWindowNote, { uploadEnds: planWindow.uploadEndsLabel, accessEnds: planWindow.accessEndsLabel })}
              <p className="mt-1">{s.planWindowNoteSub}</p>
            </div>
          ) : null}
        </div>

        <Input label={s.titleLabel} name="title" defaultValue={event.title} required />
        <Input
          label={isCouple ? s.clientNameLabelCouple : s.clientNameLabelPhotographer}
          name="clientName"
          defaultValue={event.client_name ?? ""}
        />
        <Input
          label={s.eventDateLabel}
          name="eventDate"
          type="date"
          defaultValue={event.event_date ? event.event_date.slice(0, 10) : ""}
          required={isCouple}
          hint={isCouple ? s.eventDateHintCouple : undefined}
        />
        {isCouple ? (
          <div className="notice notice-info">
            <p className="font-medium text-ink">{s.privateAccessTitle}</p>
            <p className="mt-1">
              {t(s.privateAccessBody, { end: planWindow?.accessEndsLabel ?? s.privateAccessFallback })}
            </p>
          </div>
        ) : (
          <Input
            label={s.expiresLabel}
            name="expiresAt"
            type="datetime-local"
            defaultValue={event.expires_at ? event.expires_at.slice(0, 16) : ""}
            max={expiresAtMax}
          />
        )}
        <Input label={s.uploadPinLabel} name="uploadPin" placeholder={s.pinKeepPlaceholder} />
        <Input label={s.galleryPinLabel} name="galleryPin" placeholder={s.pinKeepPlaceholder} />
        <Input
          label={s.maxSizeLabel}
          name="maxGuestUploadMb"
          type="number"
          min="10"
          max="2048"
          defaultValue={String(event.event_settings?.max_guest_upload_mb ?? 250)}
        />

        <div className="flex min-h-12 items-center text-sm text-ink-2">
          {s.galleryPinStatus}{" "}
          <span className="font-semibold text-ink">
            {event.gallery_pin_hash ? s.statusSet : s.statusNotSet}
          </span>
        </div>
        <div className="flex min-h-12 items-center text-sm text-ink-2">
          {s.uploadPinStatus}{" "}
          <span className="font-semibold text-ink">
            {event.upload_pin_hash ? s.statusSet : s.statusNotSet}
          </span>
        </div>

        <div className="hairline md:col-span-2" aria-hidden="true" />
        <label className="check-row">
          <input type="checkbox" name="allowGuestUpload" defaultChecked={event.event_settings?.allow_guest_upload ?? true} className="size-4" />
          {s.allowGuestUpload}
        </label>
        <label className="check-row">
          <input type="checkbox" name="allowGuestVideo" defaultChecked={event.event_settings?.allow_guest_video ?? true} className="size-4" />
          {s.allowGuestVideo}
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            name="allowVideoMessages"
            defaultChecked={event.event_settings?.allow_video_messages ?? true}
            className="size-4"
          />
          {s.allowVideoMessages}
        </label>
        <label className="check-row">
          <input type="checkbox" name="requirePinForUpload" defaultChecked={event.event_settings?.require_pin_for_upload ?? false} className="size-4" />
          {s.requirePinUpload}
        </label>
        <label className="check-row">
          <input type="checkbox" name="requirePinForGallery" defaultChecked={event.event_settings?.require_pin_for_gallery ?? true} className="size-4" />
          {isCouple ? s.requirePinGalleryCouple : s.requirePinGalleryPhotographer}
        </label>

        {state?.error ? <div role="alert" className="notice notice-error md:col-span-2">{state.error}</div> : null}
        {!state?.error && (state || saved) ? (
          <div role="status" className="notice notice-success md:col-span-2">
            {isCouple ? s.savedCouple : s.savedPhotographer}
          </div>
        ) : null}

        <div className="md:col-span-2 flex justify-end border-t border-rule pt-[var(--space-lg)]">
          <Button type="submit" size="md" disabled={isPending} aria-busy={isPending}>
            {isPending ? s.saving : s.save}
          </Button>
        </div>
      </form>
  );
}
