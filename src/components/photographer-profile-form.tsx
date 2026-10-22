"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PROFILE_AVATAR_MAX_MB } from "@/lib/constants";
import { t, type Dict } from "@/lib/i18n/index";
import type { UserRecord } from "@/lib/types";

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

  // The chosen photo shows at once, before the save. `pickedFor` is the action
  // state it was chosen under, so "not saved yet" ends with the next success
  // without an effect having to reset it.
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; pickedFor: typeof state } | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  function replacePreview(next: { url: string; pickedFor: typeof state } | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next?.url ?? null;
    setPreview(next);
  }

  function onPickImage(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    let problem: string | null = null;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) problem = s.imageWrongType;
    else if (file.size > PROFILE_AVATAR_MAX_MB * 1024 * 1024) problem = t(s.imageTooLarge, { mb: PROFILE_AVATAR_MAX_MB });

    if (problem) {
      // Never submit a file that the server would refuse anyway.
      input.value = "";
      setImageError(problem);
      return;
    }
    setImageError(null);
    replacePreview({ url: URL.createObjectURL(file), pickedFor: state });
  }

  function revertImage() {
    if (fileInput.current) fileInput.current.value = "";
    setImageError(null);
    replacePreview(null);
  }

  // Saved once a success arrives after the pick; an error leaves it unsaved.
  const pending = Boolean(preview && !(state?.success && state !== preview.pickedFor));
  const shownUrl = preview?.url ?? avatarPreviewUrl ?? null;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] [&>*]:min-w-0">
        <div className="rounded-[24px] border border-black/10 bg-[var(--color-paper)]/55 p-5">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{s.profileImage}</p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label={s.changeImage}
            className="relative mx-auto mt-4 block aspect-square w-full max-w-[220px] overflow-hidden rounded-full border border-black/10 bg-white outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-accent)]/30"
          >
            {shownUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(235,132,88,0.16),_transparent_55%),linear-gradient(135deg,_rgba(23,32,51,0.08),_rgba(255,248,240,0.92))] p-6 text-center text-sm leading-6 text-black/45">
                {s.imagePlaceholder}
              </span>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickImage}
            className="sr-only"
            tabIndex={-1}
          />
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-paper)]"
            >
              {s.changeImage}
            </button>
            {pending ? (
              <button
                type="button"
                onClick={revertImage}
                className="inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-black/60 underline-offset-4 hover:underline"
              >
                {s.revertImage}
              </button>
            ) : null}
          </div>
          {imageError ? (
            <p role="alert" className="mt-3 rounded-2xl bg-[#fff0eb] px-3 py-2 text-center text-xs font-medium text-[#8a1c1c]">
              {imageError}
            </p>
          ) : pending ? (
            <p className="mt-3 rounded-2xl bg-[#fff6f1] px-3 py-2 text-center text-xs font-semibold text-[var(--color-ink)]">
              {s.imagePending}
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-black/55">{t(s.imageHint, { mb: PROFILE_AVATAR_MAX_MB })}</p>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2 [&>*]:min-w-0 [&_input]:w-full [&_input]:min-w-0 [&_textarea]:w-full [&_textarea]:min-w-0">
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
