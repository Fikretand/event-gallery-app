"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";

export function ResetPasswordForm({
  action,
}: {
  action: (
    state: { error?: string; success?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string; success?: string } | void>;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  return (
    <Panel className="mx-auto w-full max-w-md bg-white/92">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Set new password</p>
          <h2 className="text-3xl font-semibold text-[var(--color-ink)]">Choose a fresh password</h2>
        </div>

        <Input label="New password" name="password" type="password" placeholder="At least 8 characters" required />
        <Input label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat your new password" required />

        {state?.error ? (
          <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div>
        ) : null}
        {state?.success ? (
          <div className="rounded-[24px] border border-[var(--color-moss)]/15 bg-[#eef8f2] px-5 py-4 text-sm font-medium text-[var(--color-moss)]">
            {state.success}
          </div>
        ) : null}

        <Button type="submit" fullWidth disabled={isPending}>
          {isPending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </Panel>
  );
}
