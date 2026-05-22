"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

interface GalleryUnlockStrings {
  pinLabel: string;
  pinPlaceholder: string;
  unlocking: string;
  unlock: string;
}

const EN_DEFAULTS: GalleryUnlockStrings = {
  pinLabel: "Gallery PIN",
  pinPlaceholder: "Enter the PIN from your photographer",
  unlocking: "Unlocking…",
  unlock: "Unlock gallery",
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
          type="password"
          className="rounded-2xl border border-black/10 bg-white px-4 py-3"
          placeholder={s.pinPlaceholder}
          required
        />
      </label>
      {state?.error ? (
        <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">
          {state.error}
        </div>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? s.unlocking : s.unlock}
      </Button>
    </form>
  );
}
