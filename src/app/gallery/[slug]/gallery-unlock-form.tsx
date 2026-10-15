"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

interface GalleryUnlockStrings {
  pinLabel: string;
  pinPlaceholder: string;
  unlocking: string;
  unlock: string;
  wrongPin: string;
  tooManyAttempts: string;
}

const EN_DEFAULTS: GalleryUnlockStrings = {
  pinLabel: "Gallery PIN",
  pinPlaceholder: "PIN from the host",
  unlocking: "Unlocking…",
  unlock: "Unlock gallery",
  wrongPin: "That PIN isn't right. Check it and try again.",
  tooManyAttempts: "Too many attempts. Wait 15 minutes and try again.",
};

export function GalleryUnlockForm({
  action,
  strings,
}: {
  action: (
    state: { error?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string } | void>;
  strings?: Partial<GalleryUnlockStrings>;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const s: GalleryUnlockStrings = { ...EN_DEFAULTS, ...strings };

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        <span>{s.pinLabel}</span>
        <input
          name="pin"
          // Plain text, not a password: everyone at the event shares this PIN,
          // so masking it only makes it harder to type off a printed card, and a
          // password field invites the phone to save it as a login.
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="rounded-2xl border border-black/10 bg-white px-4 py-3 tracking-[0.08em]"
          placeholder={s.pinPlaceholder}
          required
        />
      </label>
      {state?.error ? (
        <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">
          {state.error === "GALLERY_PIN_RATE_LIMITED"
            ? s.tooManyAttempts
            : state.error === "GALLERY_PIN_WRONG"
              ? s.wrongPin
              : state.error}
        </div>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? s.unlocking : s.unlock}
      </Button>
    </form>
  );
}
