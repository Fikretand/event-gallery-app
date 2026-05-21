"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRecord } from "@/lib/types";

export function PhotographerProfileForm({
  profile,
  action,
  avatarPreviewUrl,
}: {
  profile: UserRecord;
  action: (
    state: { error?: string; success?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string; success?: string } | void>;
  avatarPreviewUrl?: string | null;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[24px] border border-black/10 bg-[var(--color-paper)]/55 p-5">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Profile image</p>
          <div className="mt-4 overflow-hidden rounded-[24px] border border-black/10 bg-white">
            {avatarPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreviewUrl} alt={profile.full_name ?? "Profile"} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.16),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] p-6 text-center text-sm leading-6 text-black/45">
                Add a profile image for your dashboard and optional homepage spotlight.
              </div>
            )}
          </div>
          <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[var(--color-ink)]">
            <span>Upload new image</span>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
            />
            <span className="text-xs font-normal text-black/55">Images up to 5 MB. The newest upload replaces the previous image.</span>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input label="Name" name="fullName" defaultValue={profile.full_name ?? ""} required />
          <Input label="City" name="city" defaultValue={profile.city ?? ""} placeholder="Sarajevo" />
          <Input label="Phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="+387 ..." />
          <Input label="Email" value={profile.email} disabled />
          <Input label="Website" name="websiteUrl" defaultValue={profile.website_url ?? ""} placeholder="https://yourstudio.com" />
          <Input label="Instagram" name="instagramUrl" defaultValue={profile.instagram_url ?? ""} placeholder="https://instagram.com/yourstudio" />
          <div className="md:col-span-2">
            <Input label="Facebook" name="facebookUrl" defaultValue={profile.facebook_url ?? ""} placeholder="https://facebook.com/yourstudio" />
          </div>
          <label className="md:col-span-2 flex flex-col gap-2 text-sm font-medium text-[var(--color-ink)]">
            <span>Short bio</span>
            <textarea
              name="bio"
              defaultValue={profile.bio ?? ""}
              rows={4}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/35 focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/20"
              placeholder="Tell couples a little about your style and where you work."
            />
          </label>
        </div>
      </div>

      <div className="rounded-[24px] border border-black/10 bg-white p-5">
        <p className="text-sm font-semibold text-[var(--color-ink)]">Homepage spotlight</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">
          Included as a photographer benefit, this gives you a simple place to be seen by couples exploring Confetti for their own wedding or next event.
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
            <input type="checkbox" name="publicProfileConsent" defaultChecked={profile.public_profile_consent} className="size-4" />
            I consent to appearing in the Confetti photographer spotlight.
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
            <input type="checkbox" name="showOnHomepage" defaultChecked={profile.show_on_homepage} className="size-4" />
            Show my spotlight card on the homepage.
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
            <input
              type="checkbox"
              name="publicEmailOnHomepage"
              defaultChecked={profile.public_email_on_homepage}
              className="size-4"
            />
            Let couples contact me by email from the spotlight card.
          </label>
        </div>
      </div>

      {state?.error ? <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div> : null}
      {state?.success ? <div className="rounded-2xl bg-[#eef9f0] px-4 py-3 text-sm text-[#1f6b35]">{state.success}</div> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
