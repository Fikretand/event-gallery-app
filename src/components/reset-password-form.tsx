"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";

import { passwordMeetsPolicy, WEAK_PASSWORD, type PasswordRule } from "@/lib/password-policy";
import { PasswordRequirements } from "@/components/password-requirements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";

export function ResetPasswordForm({
  action,
  passwordRule,
  passwordRules,
}: {
  action: (
    state: { error?: string; success?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string; success?: string } | void>;
  /** The rule, already in the reader's language — the rest of this form is not
   *  translated yet, but an error the server returns must never reach them as a
   *  bare sentinel. */
  passwordRule: string;
  /** One label per rule, for the live checklist under the field. */
  passwordRules: Record<PasswordRule, string>;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const [password, setPassword] = useState("");

  // Same reason as the signup form: dispatching by hand keeps React from
  // resetting the fields when the action returns an error.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Panel className="mx-auto w-full max-w-md bg-white/92">
      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Set new password</p>
          <h2 className="text-3xl font-semibold text-[var(--color-ink)]">Choose a fresh password</h2>
        </div>

        <Input
          label="New password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="password-requirements"
          autoComplete="new-password"
          required
        />
        <PasswordRequirements id="password-requirements" password={password} labels={passwordRules} />
        <Input label="Confirm password" name="confirmPassword" type="password" placeholder="Repeat your new password" required />

        {state?.error ? (
          <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">
            {state.error === WEAK_PASSWORD ? passwordRule : state.error}
          </div>
        ) : null}
        {state?.success ? (
          <div className="rounded-[24px] border border-[var(--color-moss)]/15 bg-[#eef8f2] px-5 py-4 text-sm font-medium text-[var(--color-moss)]">
            {state.success}
          </div>
        ) : null}

        <Button type="submit" fullWidth disabled={isPending || !passwordMeetsPolicy(password)}>
          {isPending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </Panel>
  );
}
