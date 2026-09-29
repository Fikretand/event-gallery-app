"use client";

import { useActionState, useState, useTransition, type FormEvent } from "react";

import { PasswordRequirements } from "@/components/password-requirements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Dict } from "@/lib/i18n/index";
import {
  CURRENT_PASSWORD_WRONG,
  PASSWORD_MISMATCH,
  PASSWORD_UPDATED,
  passwordMeetsPolicy,
  SAME_PASSWORD,
  WEAK_PASSWORD,
} from "@/lib/password-policy";

type Strings = Dict["dashboard"]["profile"]["changePassword"] & {
  rule: string;
  rules: Dict["auth"]["passwordRules"];
  working: string;
};

export function ChangePasswordForm({
  action,
  strings: s,
}: {
  action: (
    state: { error?: string; success?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string; success?: string } | void>;
  strings: Strings;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const [password, setPassword] = useState("");

  // Dispatched by hand so a wrong current password does not wipe what was typed.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  if (state?.success === PASSWORD_UPDATED) {
    // Replacing the form, rather than clearing it, means no password is left
    // sitting in a field after it has done its job.
    return (
      <div
        role="status"
        className="rounded-[24px] border border-[var(--color-moss)]/15 bg-[#eef8f2] px-5 py-4 text-sm font-medium text-[var(--color-moss)]"
      >
        {s.success}
      </div>
    );
  }

  const errorText =
    state?.error === WEAK_PASSWORD
      ? s.rule
      : state?.error === PASSWORD_MISMATCH
        ? s.mismatch
        : state?.error === CURRENT_PASSWORD_WRONG
          ? s.wrongCurrent
          : state?.error === SAME_PASSWORD
            ? s.samePassword
            : state?.error;

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid max-w-md gap-4">
      <Input
        label={s.current}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        required
      />
      <Input
        label={s.next}
        name="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-describedby="change-password-requirements"
        autoComplete="new-password"
        required
      />
      <PasswordRequirements id="change-password-requirements" password={password} labels={s.rules} />
      <Input label={s.confirm} name="confirmPassword" type="password" autoComplete="new-password" required />

      {errorText ? (
        <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{errorText}</div>
      ) : null}

      <div>
        <Button type="submit" disabled={isPending || !passwordMeetsPolicy(password)}>
          {isPending ? s.working : s.submit}
        </Button>
      </div>
    </form>
  );
}
