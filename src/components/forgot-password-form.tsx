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
    <Panel className="mx-auto w-full max-w-md bg-white/92">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">{f.eyebrow}</p>
          <h2 className="text-3xl font-semibold text-[var(--color-ink)]">{f.title}</h2>
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
          <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{errorText}</div>
        ) : null}
        {state?.success === RESET_LINK_SENT ? (
          <div className="rounded-[24px] border border-[var(--color-moss)]/15 bg-[#eef8f2] px-5 py-4 text-sm font-medium text-[var(--color-moss)]">
            {f.sent}
          </div>
        ) : null}

        <Button type="submit" fullWidth disabled={isPending}>
          {isPending ? f.sending : f.submit}
        </Button>
      </form>
    </Panel>
  );
}
