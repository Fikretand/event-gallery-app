"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserRecord } from "@/lib/types";
import type { Dict } from "@/lib/i18n/index";

export function PhotographerProfileForm({
  profile,
  action,
  avatarPreviewUrl,
  strings,
}: {
  profile: UserRecord;
  action: (
    state: { error?: string; success?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string; success?: string } | void>;
  avatarPreviewUrl?: string | null;
  strings: Dict["dashboard"]["profileForm"];
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const s = strings;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[24px] border border-black/10 bg-[var(--color-paper)]/55 p-5">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{s.profileImage}</p>
          <div className="mt-4 overflow-hidden rounded-[24px] border border-black/10 bg-white">
            {avatarPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreviewUrl} alt={profile.full_name ?? "Profile"} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.16),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] p-6 text-center text-sm leading-6 text-black/45">
                {s.imagePlaceholder}
              </div>
            )}
          </div>
          <label className="mt-4 flex flex-col gap-2 text-sm font-medium text-[var(--color-ink)]">
            <span>{s.uploadNewImage}</span>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm"
            />
            <span className="text-xs font-normal text-black/55">{s.imageHint}</span>
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input label={s.nameLabel} name="fullName" defaultValue={profile.full_name ?? ""} required />
          <Input label={s.cityLabel} name="city" defaultValue={profile.city ?? ""} placeholder="Sarajevo" />
          <Input label={s.phoneLabel} name="phone" defaultValue={profile.phone ?? ""} placeholder="+387 ..." />
          <Input label={s.emailLabel} value={profile.email} disabled />
          <Input label={s.websiteLabel} name="websiteUrl" defaultValue={profile.website_url ?? ""} placeholder="https://yourstudio.com" />
          <Input label={s.instagramLabel} name="instagramUrl" defaultValue={profile.instagram_url ?? ""} placeholder="https://instagram.com/yourstudio" />
          <div className="md:col-span-2">
            <Input label={s.facebookLabel} name="facebookUrl" defaultValue={profile.facebook_url ?? ""} placeholder="https://facebook.com/yourstudio" />
          </div>
          <label className="md:col-span-2 flex flex-col gap-2 text-sm font-medium text-[var(--color-ink)]">
            <span>{s.bioLabel}</span>
            <textarea
              name="bio"
              defaultValue={profile.bio ?? ""}
              rows={4}
              className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/35 focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/20"
              placeholder={s.bioPlaceholder}
            />
          </label>
        </div>
      </div>

      <div className="rounded-[24px] border border-black/10 bg-white p-5">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{s.spotlightTitle}</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/62">{s.spotlightBody}</p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
            <input type="checkbox" name="publicProfileConsent" defaultChecked={profile.public_profile_consent} className="size-4" />
            {s.consentSpotlight}
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
            <input type="checkbox" name="showOnHomepage" defaultChecked={profile.show_on_homepage} className="size-4" />
            {s.showOnHomepage}
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-paper)]/55 px-4 py-3 text-sm font-medium text-[var(--color-ink)]">
            <input
              type="checkbox"
              name="publicEmailOnHomepage"
              defaultChecked={profile.public_email_on_homepage}
              className="size-4"
            />
            {s.publicEmail}
          </label>
        </div>
      </div>

      <div className="rounded-[24px] border border-black/10 bg-[var(--color-paper)]/55 p-5">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{s.languageTitle}</p>
        <p className="mt-1 text-xs leading-5 text-black/55">{s.languageHint}</p>
        <div className="mt-3 inline-flex items-center rounded-full border border-black/10 bg-white p-0.5 text-sm font-semibold">
          {(["en", "bs"] as const).map((loc) => (
            <label key={loc} className="cursor-pointer">
              <input
                type="radio"
                name="preferredLocale"
                value={loc}
                defaultChecked={(profile.preferred_locale ?? "en") === loc}
                className="peer sr-only"
              />
              <span className="block rounded-full px-4 py-1.5 text-[var(--color-ink)]/70 peer-checked:bg-[var(--color-ink)] peer-checked:text-white">
                {loc === "en" ? "English" : "Bosanski"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {state?.error ? <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div> : null}
      {state?.success ? <div className="rounded-2xl bg-[#eef9f0] px-4 py-3 text-sm text-[#1f6b35]">{state.success}</div> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? s.saving : s.save}
        </Button>
      </div>
    </form>
  );
}
