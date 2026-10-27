"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import type { Dict } from "@/lib/i18n/index";
import { RESET_LINK_SENT, RESET_RATE_LIMITED } from "@/lib/password-policy";

export function ForgotPasswordForm({
  action,
  strings,
}: {
  action: (
    state: { error?: string; success?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string; success?: string } | void>;
  strings: Pick<Dict["auth"], "forgotForm" | "formEmail" | "formEmailPlaceholder">;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const f = strings.forgotForm;
  const errorText = state?.error === RESET_RATE_LIMITED ? f.rateLimited : state?.error;

  return (
    <Panel className="w-full max-w-md">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <h2 className="title text-ink">{f.title}</h2>
        </div>

        <Input
          label={strings.formEmail}
          name="email"
          type="email"
          placeholder={strings.formEmailPlaceholder}
          autoComplete="email"
          required
        />

        {errorText ? (
          <div role="alert" className="notice notice-error">{errorText}</div>
        ) : null}
        {state?.success === RESET_LINK_SENT ? (
          <div role="status" className="notice notice-success">
            {f.sent}
          </div>
        ) : null}

        <Button type="submit" size="md" fullWidth disabled={isPending}>
          {isPending ? f.sending : f.submit}
        </Button>
      </form>
    </Panel>
  );
}
