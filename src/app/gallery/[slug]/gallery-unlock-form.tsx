"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

export function GalleryUnlockForm({
  action,
}: {
  action: (
    state: { error?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string } | void>;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <label className="flex flex-col gap-2 text-sm font-medium">
        <span>Gallery PIN</span>
        <input
          name="pin"
          type="password"
          className="rounded-2xl border border-black/10 bg-white px-4 py-3"
          placeholder="Enter the PIN from your photographer"
          required
        />
      </label>
      {state?.error ? <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Unlocking..." : "Unlock gallery"}
      </Button>
    </form>
  );
}
