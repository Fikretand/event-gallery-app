"use client";

import Link from "next/link";
import { useActionState, useState, useTransition, type FormEvent } from "react";

import {
  PASSWORD_MISMATCH,
  PASSWORD_UPDATED,
  passwordMeetsPolicy,
  RESET_SESSION_EXPIRED,
  WEAK_PASSWORD,
} from "@/lib/password-policy";
import { PasswordRequirements } from "@/components/password-requirements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import type { Dict } from "@/lib/i18n/index";

type ResetStrings = Pick<
  Dict["auth"],
  "resetForm" | "formPasswordPlaceholder" | "formPasswordRule" | "passwordRules" | "formWorking"
>;

export function ResetPasswordForm({
  action,
  strings,
  loginHref,
}: {
  action: (
    state: { error?: string; success?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string; success?: string } | void>;
  strings: ResetStrings;
  loginHref: string;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const f = strings.resetForm;

  // Same reason as the signup form: dispatching by hand keeps React from
  // resetting the fields when the action returns an error.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  // The action answers in codes so this form can speak the reader's language;
  // anything else (Supabase's own text) is shown as it came.
  const errorText =
    state?.error === WEAK_PASSWORD
      ? strings.formPasswordRule
      : state?.error === PASSWORD_MISMATCH
        ? f.mismatch
        : state?.error === RESET_SESSION_EXPIRED
          ? f.sessionExpired
          : state?.error;
  const succeeded = state?.success === PASSWORD_UPDATED;

  return (
    <Panel className="w-full max-w-md">
      {/* `action` stays for a submit that lands before hydration; see auth-form. */}
      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <h2 className="title text-ink">{f.title}</h2>
        </div>

        <Input
          label={f.newPassword}
          name="password"
          type="password"
          placeholder={strings.formPasswordPlaceholder}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby="password-requirements"
          autoComplete="new-password"
          required
        />
        <PasswordRequirements id="password-requirements" password={password} labels={strings.passwordRules} />
        <Input
          label={f.confirmPassword}
          name="confirmPassword"
          type="password"
          placeholder={f.confirmPlaceholder}
          autoComplete="new-password"
          required
        />

        {errorText ? (
          <div role="alert" className="notice notice-error">{errorText}</div>
        ) : null}
        {succeeded ? (
          <div role="status" className="notice notice-success">
            {f.success}{" "}
            <Link href={loginHref} className="font-semibold underline underline-offset-4">
              {f.goToLogin}
            </Link>
          </div>
        ) : null}

        <Button type="submit" size="md" fullWidth disabled={isPending || !passwordMeetsPolicy(password)}>
          {isPending ? strings.formWorking : f.submit}
        </Button>
      </form>
    </Panel>
  );
}
