"use client";

import Link from "next/link";
import { useActionState, useState, useTransition, type FormEvent } from "react";
import { usePathname } from "next/navigation";

import { normalizeAccountType } from "@/lib/account";
import { passwordMeetsPolicy, WEAK_PASSWORD } from "@/lib/password-policy";
import type { AccountType } from "@/lib/types";
import { PasswordRequirements } from "@/components/password-requirements";
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
  | "formPasswordRule"
  | "passwordRules"
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
  formPasswordRule:
    "At least 8 characters, with an upper and a lower case letter, a number, and one symbol (e.g. ! ? # @).",
  passwordRules: {
    length: "At least 8 characters",
    upper: "One upper case letter",
    lower: "One lower case letter",
    digit: "One number",
    symbol: "One symbol, e.g. ! ? # @",
  },
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
  const [, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const resolvedIntent = normalizeAccountType(intent);
  const isSignup = mode === "signup";
  const isCoupleSignup = isSignup && resolvedIntent === "couple";
  // Login must accept whatever password the account already has; only a new
  // one has to meet the rule.
  const canSubmit = !isSignup || passwordMeetsPolicy(password);

  // Dispatched by hand rather than through <form action>. With a function in
  // `action`, React resets the form once the action returns — including when it
  // returns an error — so a mistyped password wiped the name and email the
  // person had just entered. Submitting this way leaves the fields alone.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const s: AuthStrings = { ...EN_STRINGS, ...strings };

  const forgotHref = `/${locale}/forgot-password`;

  return (
    <Panel className="mx-auto w-full max-w-md bg-white/92">
      {/* `action` stays for the moment before hydration: without it, a submit that
          lands before JavaScript loads would fall back to a GET and put the
          password in the URL. Once hydrated, onSubmit prevents that path and
          React skips the action (and with it, the reset). */}
      <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" ? <input type="hidden" name="intent" value={resolvedIntent} /> : null}
        {mode === "signup" ? <input type="hidden" name="plan" value={plan} /> : null}
        {mode === "signup" ? <input type="hidden" name="locale" value={locale} /> : null}
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
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={isSignup ? "password-requirements" : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
        />
        {isSignup ? (
          <PasswordRequirements id="password-requirements" password={password} labels={s.passwordRules} />
        ) : null}

        {mode === "login" ? (
          <div className="flex justify-end">
            <Link href={forgotHref} className="text-sm font-semibold text-[var(--color-accent)]">
              {s.formForgotPassword}
            </Link>
          </div>
        ) : null}

        {state?.error ? (
          <div className="rounded-2xl bg-[#fff0eb] px-4 py-3 text-sm text-[#8a1c1c]">
            {state.error === WEAK_PASSWORD ? s.formPasswordRule : state.error}
          </div>
        ) : null}

        <Button type="submit" fullWidth disabled={isPending || !canSubmit}>
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
