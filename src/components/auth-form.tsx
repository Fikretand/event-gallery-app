"use client";

import Link from "next/link";
import { useActionState } from "react";

import { normalizeAccountType } from "@/lib/account";
import type { AccountType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";

export function AuthForm({
  action,
  mode,
  intent = "photographer",
}: {
  action: (
    state: { error?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string } | void>;
  mode: "login" | "signup";
  intent?: AccountType;
}) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const resolvedIntent = normalizeAccountType(intent);
  const isCoupleSignup = mode === "signup" && resolvedIntent === "couple";

  return (
    <Panel className="mx-auto w-full max-w-md bg-white/92">
      <form action={formAction} className="space-y-4">
        {mode === "signup" ? <input type="hidden" name="intent" value={resolvedIntent} /> : null}
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
            {mode === "login" ? "Welcome back" : isCoupleSignup ? "Start your one-time event" : "Start your workspace"}
          </p>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">
            {mode === "login"
              ? "Login to your account"
              : isCoupleSignup
                ? "Create your wedding event account"
                : "Create photographer account"}
          </h1>
        </div>

        {mode === "signup" ? (
          <Input
            label={isCoupleSignup ? "Your name" : "Full name"}
            name="fullName"
            placeholder={isCoupleSignup ? "Amina & Ajdin" : "Studio or personal name"}
            required
          />
        ) : null}
        <Input label="Email" name="email" type="email" placeholder="you@example.com" required />
        <Input label="Password" name="password" type="password" placeholder="At least 8 characters" required />

        {mode === "login" ? (
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-semibold text-[var(--color-accent)]">
              Forgot password?
            </Link>
          </div>
        ) : null}

        {state?.error ? (
          <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">{state.error}</div>
        ) : null}

        <Button type="submit" fullWidth disabled={isPending}>
          {isPending ? "Working..." : mode === "login" ? "Login" : isCoupleSignup ? "Create event account" : "Create account"}
        </Button>
      </form>
    </Panel>
  );
}
