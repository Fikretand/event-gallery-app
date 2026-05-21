"use client";

import { useActionState } from "react";

import { normalizeAccountType } from "@/lib/account";
import type { AccountType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";

export function EventCreateForm({
  action,
  intent = "photographer",
  expiresAtDefault,
  expiresAtMax,
}: {
  action: (
    state: { error?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string } | void>;
  intent?: AccountType;
  expiresAtDefault?: string;
  expiresAtMax?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const isCouple = normalizeAccountType(intent) === "couple";

  return (
    <Panel className="bg-white/90">
      <form action={formAction} className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            {isCouple ? "Create your wedding event" : "Create event"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">
            {isCouple
              ? "Set the privacy rules once, then share the guest upload link and private gallery with everyone."
              : "Set the upload rules once, then share the guest upload link and client gallery."}
          </p>
          {isCouple ? (
            <div className="mt-4 rounded-[22px] border border-[var(--color-accent)]/18 bg-[linear-gradient(180deg,rgba(246,211,195,0.34),rgba(255,255,255,0.9))] px-4 py-3 text-sm leading-6 text-black/68">
              Your one-time plan includes one event, 30 days of guest uploads from your event date, and up to 90 days of private gallery access from your event date.
              <p className="mt-2 text-xs leading-5 text-black/55">
                Changing the event date later updates these plan windows to follow the new event date.
              </p>
            </div>
          ) : null}
        </div>

        <Input
          label="Event title"
          name="title"
          placeholder={isCouple ? "Amina & Ajdin wedding" : "Lejla & Amar wedding"}
          required
        />
        <Input
          label={isCouple ? "Couple name" : "Client name"}
          name="clientName"
          placeholder={isCouple ? "Amina and Ajdin" : "Lejla and Amar"}
        />
        <Input
          label="Event date"
          name="eventDate"
          type="date"
          required={isCouple}
          hint={isCouple ? "Required for this plan so your upload and access windows follow the wedding date." : undefined}
        />
        {isCouple ? (
          <div className="rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm leading-6 text-black/65">
            <p className="font-medium text-[var(--color-ink)]">Private gallery access</p>
            <p className="mt-1">
              Managed automatically by your plan for up to 90 days from your event date.
            </p>
          </div>
        ) : (
          <Input
            label="Expires at"
            name="expiresAt"
            type="datetime-local"
            defaultValue={expiresAtDefault}
            max={expiresAtMax}
            hint="After expiry, uploads and gallery access are blocked."
          />
        )}
        <Input label="Upload PIN" name="uploadPin" placeholder="Optional" hint="Used only if upload PIN is enabled." />
        <Input label="Gallery PIN" name="galleryPin" placeholder="Required for protected galleries" />
        <Input
          label="Max guest upload size (MB)"
          name="maxGuestUploadMb"
          type="number"
          min="10"
          max="2048"
          defaultValue="250"
        />

        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="allowGuestUpload" defaultChecked className="size-4" />
          Allow guest uploads
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="allowGuestVideo" defaultChecked className="size-4" />
          Allow guest video uploads
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="requirePinForUpload" className="size-4" />
          Require PIN for guest upload
        </label>
        <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/60 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
          <input type="checkbox" name="requirePinForGallery" defaultChecked className="size-4" />
          Require PIN for client gallery
        </label>

        {state?.error ? <div className="md:col-span-2 rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div> : null}

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : isCouple ? "Create wedding event" : "Create event"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
