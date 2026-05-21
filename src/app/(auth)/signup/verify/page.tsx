import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { Panel } from "@/components/ui/panel";
import { normalizeAccountType } from "@/lib/account";

export default async function SignupVerifyPage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string; email?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const intent = normalizeAccountType(resolvedSearchParams?.intent);
  const email = resolvedSearchParams?.email ?? "your inbox";
  const isCouple = intent === "couple";

  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell py-12">
        <Panel className="mx-auto max-w-2xl bg-white/92">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
            Check your email
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
            {isCouple ? "Confirm your email to create the wedding event." : "Confirm your email to open your workspace."}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-black/68">
            We sent a confirmation link to <span className="font-semibold text-[var(--color-ink)]">{email}</span>. Open
            that email and confirm your address to continue.
          </p>
          <div className="mt-6 rounded-[24px] border border-black/8 bg-[var(--color-paper)]/60 px-5 py-4 text-sm leading-6 text-black/70">
            After you confirm, we will take you straight into {isCouple ? "the one-time event setup" : "your dashboard"}.
          </div>
          <p className="mt-6 text-sm text-black/58">
            Used the wrong address?{" "}
            <Link href={`/signup?intent=${intent}`} className="font-semibold text-[var(--color-accent)]">
              Go back to signup
            </Link>
            .
          </p>
        </Panel>
      </section>
    </main>
  );
}
