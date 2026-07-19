"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
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
    <Panel className="bg-white/90">
      <form action={formAction} className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">{s.heading}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">
            {isCouple ? s.introCouple : s.introPhotographer}
          </p>
          <div className="mt-4 rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm leading-6 text-black/62">
            {s.linksNote}
          </div>
          {isCouple && planWindow ? (
            <div className="mt-4 rounded-2xl border border-[var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(246,211,195,0.34),rgba(255,255,255,0.9))] px-4 py-3 text-sm leading-6 text-black/68">
              {t(s.planWindowNote, { uploadEnds: planWindow.uploadEndsLabel, accessEnds: planWindow.accessEndsLabel })}
              <p className="mt-2 text-xs leading-5 text-black/55">{s.planWindowNoteSub}</p>
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
          <div className="rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm leading-6 text-black/65">
            <p className="font-medium text-[var(--color-ink)]">{s.privateAccessTitle}</p>
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

        <div className="rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm text-black/65">
          {s.galleryPinStatus}{" "}
          <span className="font-semibold text-[var(--color-ink)]">
            {event.gallery_pin_hash ? s.statusSet : s.statusNotSet}
          </span>
        </div>
        <div className="rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm text-black/65">
          {s.uploadPinStatus}{" "}
          <span className="font-semibold text-[var(--color-ink)]">
            {event.upload_pin_hash ? s.statusSet : s.statusNotSet}
          </span>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="allowGuestUpload" defaultChecked={event.event_settings?.allow_guest_upload ?? true} className="size-4" />
          {s.allowGuestUpload}
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="allowGuestVideo" defaultChecked={event.event_settings?.allow_guest_video ?? true} className="size-4" />
          {s.allowGuestVideo}
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="requirePinForUpload" defaultChecked={event.event_settings?.require_pin_for_upload ?? false} className="size-4" />
          {s.requirePinUpload}
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="requirePinForGallery" defaultChecked={event.event_settings?.require_pin_for_gallery ?? true} className="size-4" />
          {isCouple ? s.requirePinGalleryCouple : s.requirePinGalleryPhotographer}
        </label>

        {state?.error ? <div className="md:col-span-2 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div> : null}
        {!state?.error && (state || saved) ? (
          <div className="md:col-span-2 rounded-2xl bg-[#eef8f2] px-4 py-3 text-sm text-[var(--color-moss)]">
            {isCouple ? s.savedCouple : s.savedPhotographer}
          </div>
        ) : null}

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? s.saving : s.save}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
