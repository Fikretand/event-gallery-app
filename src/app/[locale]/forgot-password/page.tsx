import Image from "next/image";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SiteNav } from "@/components/site-nav";
import { requestPasswordResetAction } from "@/lib/actions";
import { getDictionary, type Locale } from "@/lib/i18n/index";

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.auth;

  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
            {d.forgotEyebrow}
          </p>
          <h1 className="font-display text-5xl font-semibold leading-tight text-[var(--color-ink)]">
            {d.forgotTitle}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-black/65">{d.forgotBody}</p>
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/75 shadow-[0_24px_80px_rgba(18,24,38,0.08)]">
            <Image
              src="/confetti-hero.svg"
              alt="Confetti recovery illustration"
              width={920}
              height={760}
              className="h-auto w-full"
              priority
            />
          </div>
          <p className="text-sm text-black/55">
            {d.forgotRemembered}{" "}
            <Link href={`/${locale}/login`} className="font-semibold text-[var(--color-accent)]">
              {d.forgotBackLogin}
            </Link>
            .
          </p>
        </div>
        <ForgotPasswordForm action={requestPasswordResetAction} />
      </section>
    </main>
  );
}
