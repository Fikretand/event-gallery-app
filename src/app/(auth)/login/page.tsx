import Image from "next/image";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { SiteNav } from "@/components/site-nav";
import { loginAction } from "@/lib/actions";

export default function LoginPage() {
  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell grid gap-8 py-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="order-2 space-y-4 lg:order-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Secure studio access</p>
          <h1 className="text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl lg:text-5xl">
            Step back into your event control room.
          </h1>
          <p className="max-w-xl text-base leading-7 text-black/65 lg:text-lg lg:leading-8">
            Manage private galleries, guest uploads, and client delivery from a single dashboard.
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
              Guest uploads, private galleries, and delivery links stay in one calm workspace once you log in.
            </div>
          </div>
          <p className="text-sm text-black/55">
            Need an account?{" "}
            <Link href="/signup?intent=photographer" className="font-semibold text-[var(--color-accent)]">
              Create one here
            </Link>
            .
          </p>
        </div>
        <div className="order-1 lg:order-2">
          <div className="mb-4 space-y-2 lg:hidden">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">Secure studio access</p>
            <h1 className="text-3xl font-semibold leading-tight text-[var(--color-ink)]">Login to your account</h1>
            <p className="text-sm leading-6 text-black/62">Open your dashboard and keep every event in one place.</p>
          </div>
          <AuthForm action={loginAction} mode="login" />
        </div>
      </section>
    </main>
  );
}
