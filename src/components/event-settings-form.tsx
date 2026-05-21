"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import type { AccountType, EventRecord } from "@/lib/types";

export function EventSettingsForm({
  event,
  action,
  saved,
  audience = "photographer",
  expiresAtMax,
  planWindow,
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
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const isCouple = audience === "couple";

  return (
    <Panel className="bg-white/90">
      <form action={formAction} className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">Event settings</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">
            {isCouple
              ? "Update your event details, guest upload rules, expiry, and gallery privacy without creating a new event."
              : "Update event details, upload rules, expiry, and gallery protection without recreating the event."}
          </p>
          <div className="mt-4 rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm leading-6 text-black/62">
            Public guest links, client gallery links, and QR codes stay fixed after event creation so previously shared
            links and printed QR cards keep working.
          </div>
          {isCouple && planWindow ? (
            <div className="mt-4 rounded-2xl border border-[var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(246,211,195,0.34),rgba(255,255,255,0.9))] px-4 py-3 text-sm leading-6 text-black/68">
              Guest uploads stay open until {planWindow.uploadEndsLabel}. Private gallery access lasts until {planWindow.accessEndsLabel}.
              <p className="mt-2 text-xs leading-5 text-black/55">
                Changing the event date later updates these plan windows to follow the new event date.
              </p>
            </div>
          ) : null}
        </div>

        <Input label="Event title" name="title" defaultValue={event.title} required />
        <Input label={isCouple ? "Couple name" : "Client name"} name="clientName" defaultValue={event.client_name ?? ""} />
        <Input
          label="Event date"
          name="eventDate"
          type="date"
          defaultValue={event.event_date ? event.event_date.slice(0, 10) : ""}
          required={isCouple}
          hint={isCouple ? "Required for this plan so your upload and access windows follow the wedding date." : undefined}
        />
        {isCouple ? (
          <div className="rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm leading-6 text-black/65">
            <p className="font-medium text-[var(--color-ink)]">Private gallery access</p>
            <p className="mt-1">
              Managed automatically by your plan and currently ends on{" "}
              <span className="font-semibold text-[var(--color-ink)]">
                {planWindow?.accessEndsLabel ?? "the plan end date"}
              </span>
              .
            </p>
          </div>
        ) : (
          <Input
            label="Expires at"
            name="expiresAt"
            type="datetime-local"
            defaultValue={event.expires_at ? event.expires_at.slice(0, 16) : ""}
            max={expiresAtMax}
          />
        )}
        <Input label="Upload PIN" name="uploadPin" placeholder="Leave blank to keep current PIN" />
        <Input label="Gallery PIN" name="galleryPin" placeholder="Leave blank to keep current PIN" />
        <Input
          label="Max guest upload size (MB)"
          name="maxGuestUploadMb"
          type="number"
          min="10"
          max="2048"
          defaultValue={String(event.event_settings?.max_guest_upload_mb ?? 250)}
        />

        <div className="rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm text-black/65">
          Gallery PIN status:{" "}
          <span className="font-semibold text-[var(--color-ink)]">
            {event.gallery_pin_hash ? "Set" : "Not set"}
          </span>
        </div>
        <div className="rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm text-black/65">
          Upload PIN status:{" "}
          <span className="font-semibold text-[var(--color-ink)]">
            {event.upload_pin_hash ? "Set" : "Not set"}
          </span>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="allowGuestUpload" defaultChecked={event.event_settings?.allow_guest_upload ?? true} className="size-4" />
          Allow guest uploads
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="allowGuestVideo" defaultChecked={event.event_settings?.allow_guest_video ?? true} className="size-4" />
          Allow guest video uploads
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="requirePinForUpload" defaultChecked={event.event_settings?.require_pin_for_upload ?? false} className="size-4" />
          Require PIN for guest upload
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="requirePinForGallery" defaultChecked={event.event_settings?.require_pin_for_gallery ?? true} className="size-4" />
          Require PIN for client gallery
        </label>

        {state?.error ? <div className="md:col-span-2 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div> : null}
        {!state?.error && (state || saved) ? (
          <div className="md:col-span-2 rounded-2xl bg-[#eef8f2] px-4 py-3 text-sm text-[var(--color-moss)]">
            {isCouple ? "Your event settings were saved." : "Event settings saved."}
          </div>
        ) : null}

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
