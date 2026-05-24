"use client";

import Link from "next/link";
import { useActionState } from "react";
import { usePathname } from "next/navigation";

import { normalizeAccountType } from "@/lib/account";
import type { AccountType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import type { Dict } from "@/lib/i18n/index";

type AuthStrings = Pick<
  Dict["auth"],
  | "formWelcomeBack"
  | "formStartWorkspace"
  | "formStartCoupleEvent"
  | "formLoginTitle"
  | "formCreatePhotographerTitle"
  | "formCreateCoupleTitle"
  | "formYourName"
  | "formFullName"
  | "formNamePlaceholderCouple"
  | "formNamePlaceholderPhotographer"
  | "formEmail"
  | "formPassword"
  | "formPasswordPlaceholder"
  | "formForgotPassword"
  | "formLoginBtn"
  | "formCreateAccountBtn"
  | "formCreateCoupleAccountBtn"
  | "formWorking"
>;

// Inline fallback strings (English) — used when no strings prop is passed
const EN_STRINGS: AuthStrings = {
  formWelcomeBack: "Welcome back",
  formStartWorkspace: "Start your workspace",
  formStartCoupleEvent: "Start your one-time event",
  formLoginTitle: "Login to your account",
  formCreatePhotographerTitle: "Create photographer account",
  formCreateCoupleTitle: "Create your wedding event account",
  formYourName: "Your name",
  formFullName: "Full name",
  formNamePlaceholderCouple: "Amina & Ajdin",
  formNamePlaceholderPhotographer: "Studio or personal name",
  formEmail: "Email",
  formPassword: "Password",
  formPasswordPlaceholder: "At least 8 characters",
  formForgotPassword: "Forgot password?",
  formLoginBtn: "Login",
  formCreateAccountBtn: "Create account",
  formCreateCoupleAccountBtn: "Create event account",
  formWorking: "Working…",
};

function extractLocaleFromPath(pathname: string) {
  return pathname.startsWith("/bs") ? "bs" : "en";
}

export function AuthForm({
  action,
  mode,
  intent = "photographer",
  plan = "solo",
  strings,
}: {
  action: (
    state: { error?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string } | void>;
  mode: "login" | "signup";
  intent?: AccountType;
  plan?: "solo" | "pro";
  strings?: Partial<AuthStrings>;
}) {
  const pathname = usePathname();
  const locale = extractLocaleFromPath(pathname);

  const [state, formAction, isPending] = useActionState(action, undefined);
  const resolvedIntent = normalizeAccountType(intent);
  const isCoupleSignup = mode === "signup" && resolvedIntent === "couple";

  const s: AuthStrings = { ...EN_STRINGS, ...strings };

  const forgotHref = `/${locale}/forgot-password`;

  return (
    <Panel className="mx-auto w-full max-w-md bg-white/92">
      <form action={formAction} className="space-y-4">
        {mode === "signup" ? <input type="hidden" name="intent" value={resolvedIntent} /> : null}
        {mode === "signup" ? <input type="hidden" name="plan" value={plan} /> : null}
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
            {mode === "login"
              ? s.formWelcomeBack
              : isCoupleSignup
                ? s.formStartCoupleEvent
                : s.formStartWorkspace}
          </p>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">
            {mode === "login"
              ? s.formLoginTitle
              : isCoupleSignup
                ? s.formCreateCoupleTitle
                : s.formCreatePhotographerTitle}
          </h1>
        </div>

        {mode === "signup" ? (
          <Input
            label={isCoupleSignup ? s.formYourName : s.formFullName}
            name="fullName"
            placeholder={
              isCoupleSignup ? s.formNamePlaceholderCouple : s.formNamePlaceholderPhotographer
            }
            required
          />
        ) : null}
        <Input label={s.formEmail} name="email" type="email" placeholder="you@example.com" required />
        <Input
          label={s.formPassword}
          name="password"
          type="password"
          placeholder={s.formPasswordPlaceholder}
          required
        />

        {mode === "login" ? (
          <div className="flex justify-end">
            <Link href={forgotHref} className="text-sm font-semibold text-[var(--color-accent)]">
              {s.formForgotPassword}
            </Link>
          </div>
        ) : null}

        {state?.error ? (
          <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">
            {state.error}
          </div>
        ) : null}

        <Button type="submit" fullWidth disabled={isPending}>
          {isPending
            ? s.formWorking
            : mode === "login"
              ? s.formLoginBtn
              : isCoupleSignup
                ? s.formCreateCoupleAccountBtn
                : s.formCreateAccountBtn}
        </Button>
      </form>
    </Panel>
  );
}
