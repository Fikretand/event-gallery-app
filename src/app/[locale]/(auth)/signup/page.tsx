import Image from "next/image";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { SiteNav } from "@/components/site-nav";
import { normalizeAccountType } from "@/lib/account";
import { signupAction } from "@/lib/actions";
import { getDictionary, type Locale } from "@/lib/i18n/index";

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ intent?: string; plan?: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.auth;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const intent = normalizeAccountType(resolvedSearchParams?.intent);
  const plan = resolvedSearchParams?.plan === "pro" ? "pro" : "solo";
  const isCouple = intent === "couple";

  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
            {isCouple ? d.signupCoupleEyebrow : d.signupPhotographerEyebrow}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl lg:text-5xl">
            {isCouple ? d.signupCoupleTitle : d.signupPhotographerTitle}
          </h1>
          <p className="max-w-xl text-base leading-7 text-black/65 lg:text-lg lg:leading-8">
            {isCouple ? d.signupCoupleBody : d.signupPhotographerBody}
          </p>
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/75 shadow-[0_24px_80px_rgba(18,24,38,0.08)]">
            <Image
              src="/confetti-hero.svg"
              alt="Confetti private gallery illustration"
              width={920}
              height={760}
              className="hidden h-auto w-full sm:block"
              priority
            />
            <div className="px-5 py-5 text-sm leading-6 text-black/58 sm:hidden">
              {isCouple ? d.signupCoupleMobile : d.signupPhotographerMobile}
            </div>
          </div>
          <p className="text-sm text-black/55">
            {d.alreadyHaveAccess}{" "}
            <Link href={`/${locale}/login`} className="font-semibold text-[var(--color-accent)]">
              {d.logIn}
            </Link>
            .
          </p>
        </div>
        <div>
          <AuthForm action={signupAction} mode="signup" intent={intent} plan={plan} strings={d} />
        </div>
      </section>
    </main>
  );
}
