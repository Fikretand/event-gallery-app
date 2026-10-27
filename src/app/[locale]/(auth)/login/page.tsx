import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { AuthScreen } from "@/components/auth-screen";
import { loginAction } from "@/lib/actions";
import { getDictionary, type Locale } from "@/lib/i18n/index";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  // Reading searchParams makes this page dynamic. That is fine here: it is a
  // private, noindex auth screen, and without it a failed email confirmation
  // (/auth/confirm → /login?error=confirm) landed on a login form with no word
  // about what had just gone wrong.
  const { error } = await searchParams;
  const dict = getDictionary(locale as Locale);
  const d = dict.auth;

  return (
    <AuthScreen
      title={d.loginTitle}
      body={d.loginBody}
      aside={
        <p>
          {d.needAccount}{" "}
          <Link href={`/${locale}/get-started`} className="link">
            {d.createHere}
          </Link>
          .
        </p>
      }
    >
      {error === "confirm" ? (
        <p role="status" className="notice notice-warning mb-[var(--space-md)] max-w-md">
          {d.confirmLinkFailed}
        </p>
      ) : null}
      <AuthForm action={loginAction} mode="login" strings={d} />
    </AuthScreen>
  );
}
