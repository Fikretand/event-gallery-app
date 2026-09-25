import Image from "next/image";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { SiteNav } from "@/components/site-nav";
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
    <main className="pb-16">
      <SiteNav />
      <section className="shell grid gap-8 py-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
            {d.loginEyebrow}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl lg:text-5xl">
            {d.loginTitle}
          </h1>
          <p className="max-w-xl text-base leading-7 text-black/65 lg:text-lg lg:leading-8">
            {d.loginBody}
          </p>
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/75 shadow-[0_24px_80px_rgba(18,24,38,0.08)]">
            <Image
              src="/confetti-hero.svg"
              alt="Confetti platform preview illustration"
              width={920}
              height={760}
              className="hidden h-auto w-full sm:block"
              priority
            />
            <div className="px-5 py-5 text-sm leading-6 text-black/58 sm:hidden">
              {d.loginMobileBody}
            </div>
          </div>
          <p className="text-sm text-black/55">
            {d.needAccount}{" "}
            <Link
              href={`/${locale}/get-started`}
              className="font-semibold text-[var(--color-accent)]"
            >
              {d.createHere}
            </Link>
            .
          </p>
        </div>
        <div className="space-y-4">
          {error === "confirm" ? (
            <div
              role="status"
              className="mx-auto w-full max-w-md rounded-2xl border border-[#e9c9bb] bg-[#fff6f1] px-5 py-4 text-sm leading-6 text-[#7a3a22]"
            >
              {d.confirmLinkFailed}
            </div>
          ) : null}
          <AuthForm action={loginAction} mode="login" strings={d} />
        </div>
      </section>
    </main>
  );
}
