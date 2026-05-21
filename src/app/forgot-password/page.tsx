import Image from "next/image";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SiteNav } from "@/components/site-nav";
import { requestPasswordResetAction } from "@/lib/actions";

export default function ForgotPasswordPage() {
  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Recover access</p>
          <h1 className="text-5xl font-semibold leading-tight text-[var(--color-ink)]">Send a reset link to your email.</h1>
          <p className="max-w-xl text-lg leading-8 text-black/65">
            We will send you a secure recovery link so you can set a new password and get back into your dashboard.
          </p>
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
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-[var(--color-accent)]">
              Back to login
            </Link>
            .
          </p>
        </div>

        <ForgotPasswordForm action={requestPasswordResetAction} />
      </section>
    </main>
  );
}
