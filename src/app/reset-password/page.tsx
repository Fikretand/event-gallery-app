import Image from "next/image";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/reset-password-form";
import { SiteNav } from "@/components/site-nav";
import { resetPasswordAction } from "@/lib/actions";

export default function ResetPasswordPage() {
  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Recovery session</p>
          <h1 className="font-display text-5xl font-semibold leading-tight text-[var(--color-ink)]">Set your new account password.</h1>
          <p className="max-w-xl text-lg leading-8 text-black/65">
            Use a strong password you have not used before. Once saved, you can sign in normally with the new one.
          </p>
          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white/75 shadow-[0_24px_80px_rgba(18,24,38,0.08)]">
            <Image
              src="/confetti-hero.svg"
              alt="Confetti reset password illustration"
              width={920}
              height={760}
              className="h-auto w-full"
              priority
            />
          </div>
          <p className="text-sm text-black/55">
            Need a fresh recovery email?{" "}
            <Link href="/forgot-password" className="font-semibold text-[var(--color-accent)]">
              Request another link
            </Link>
            .
          </p>
        </div>

        <ResetPasswordForm action={resetPasswordAction} />
      </section>
    </main>
  );
}
