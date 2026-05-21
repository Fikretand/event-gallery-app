import Image from "next/image";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";
import { SiteNav } from "@/components/site-nav";
import { normalizeAccountType } from "@/lib/account";
import { signupAction } from "@/lib/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const intent = normalizeAccountType(resolvedSearchParams?.intent);
  const isCouple = intent === "couple";

  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell grid gap-8 py-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="order-2 space-y-4 lg:order-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
            {isCouple ? "Create your one-time event" : "Launch the MVP"}
          </p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-ink)] sm:text-4xl lg:text-5xl">
            {isCouple ? "Create one private wedding event for guest uploads and delivery." : "Create your first private event gallery workspace."}
          </h1>
          <p className="max-w-xl text-base leading-7 text-black/65 lg:text-lg lg:leading-8">
            {isCouple
              ? "Set up one event, share the QR code, and collect guest memories inside a private gallery you can revisit later."
              : "Build guest upload links, QR code sharing, and a protected delivery gallery for every event."}
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
              {isCouple
                ? "Create the event first, then share one simple upload page with your guests."
                : "Create the account first, then start building private event galleries and upload flows."}
            </div>
          </div>
          <p className="text-sm text-black/55">
            Already have access?{" "}
            <Link href="/login" className="font-semibold text-[var(--color-accent)]">
              Log in
            </Link>
            .
          </p>
        </div>
        <div className="order-1 lg:order-2">
          <div className="mb-4 space-y-2 lg:hidden">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
              {isCouple ? "Create your one-time event" : "Launch the MVP"}
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-ink)]">
              {isCouple ? "Create your wedding event account" : "Create your photographer account"}
            </h1>
            <p className="text-sm leading-6 text-black/62">
              {isCouple
                ? "Start with the essentials now, then share the event with guests."
                : "Get into the dashboard quickly, then set up your first event."}
            </p>
          </div>
          <AuthForm action={signupAction} mode="signup" intent={intent} />
        </div>
      </section>
    </main>
  );
}
