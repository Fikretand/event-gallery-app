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
        <div className="well p-5">
          <p className="field-label">{s.profileImage}</p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label={s.changeImage}
            className="relative mx-auto mt-4 block aspect-square w-full max-w-[220px] overflow-hidden rounded-full border border-rule bg-card outline-none focus-visible:ring-4 focus-visible:ring-accent/30"
          >
            {shownUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-paper-3 p-6 text-center text-sm text-ink-2">
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
              className="btn btn-sm btn-secondary"
            >
              {s.changeImage}
            </button>
            {pending ? (
              <button
                type="button"
                onClick={revertImage}
                className="inline-flex items-center justify-center rounded-full px-3 py-2 text-sm font-semibold text-ink-2 underline-offset-4 hover:underline"
              >
                {s.revertImage}
              </button>
            ) : null}
          </div>
          {imageError ? (
            <p role="alert" className="notice notice-error mt-3 text-center">
              {imageError}
            </p>
          ) : pending ? (
            <p className="notice notice-info mt-3 text-center font-semibold">
              {s.imagePending}
            </p>
          ) : (
            <p className="meta mt-3 text-center">{t(s.imageHint, { mb: PROFILE_AVATAR_MAX_MB })}</p>
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
          <label className="md:col-span-2 flex flex-col gap-2 field-label">
            <span>{s.bioLabel}</span>
            <textarea
              name="bio"
              defaultValue={profile.bio ?? ""}
              rows={4}
              className="field"
              placeholder={s.bioPlaceholder}
            />
          </label>
        </div>
      </div>

      <fieldset className="border-t border-rule pt-5">
        <legend className="float-left w-full font-semibold text-ink">{s.spotlightTitle}</legend>
        <p className="clear-left max-w-2xl pt-1 text-sm leading-6 text-ink-2">{s.spotlightBody}</p>

        <div className="mt-4 space-y-3">
          <label className="check-row">
            <input type="checkbox" name="publicProfileConsent" defaultChecked={profile.public_profile_consent} className="size-4" />
            {s.consentSpotlight}
          </label>
          <label className="check-row">
            <input type="checkbox" name="showOnHomepage" defaultChecked={profile.show_on_homepage} className="size-4" />
            {s.showOnHomepage}
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              name="publicEmailOnHomepage"
              defaultChecked={profile.public_email_on_homepage}
              className="size-4"
            />
            {s.publicEmail}
          </label>
        </div>
      </fieldset>

      <div className="border-t border-rule pt-5">
        <p className="font-semibold text-ink">{s.languageTitle}</p>
        <p className="mt-1 text-sm leading-5 text-ink-2">{s.languageHint}</p>
        <div className="mt-3 inline-flex items-center rounded-full bg-paper-2 p-1 text-sm font-semibold">
          {(["en", "bs"] as const).map((loc) => (
            <label key={loc} className="cursor-pointer">
              <input
                type="radio"
                name="preferredLocale"
                value={loc}
                defaultChecked={(profile.preferred_locale ?? "en") === loc}
                className="peer sr-only"
              />
              <span className="flex min-h-10 items-center rounded-full px-4 text-ink-2 peer-checked:bg-card peer-checked:text-ink peer-checked:shadow-[var(--shadow-card)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus)]">
                {loc === "en" ? "English" : "Bosanski"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {state?.error ? <div role="alert" className="notice notice-error">{state.error}</div> : null}
      {state?.success ? <div role="status" className="notice notice-success">{state.success}</div> : null}

      <div className="flex justify-end">
        <Button type="submit" size="md" disabled={isPending} aria-busy={isPending}>
          {isPending ? s.saving : s.save}
        </Button>
      </div>
    </form>
  );
}
