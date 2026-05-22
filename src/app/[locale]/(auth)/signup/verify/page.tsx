import Link from "next/link";

import { SiteNav } from "@/components/site-nav";
import { normalizeAccountType } from "@/lib/account";
import { getDictionary, t, type Locale } from "@/lib/i18n/index";

export default async function SignupVerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ intent?: string; email?: string }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const d = dict.auth;

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const intent = normalizeAccountType(resolvedSearchParams?.intent);
  const email = resolvedSearchParams?.email ?? "your inbox";
  const isCouple = intent === "couple";

  return (
    <main className="pb-16">
      <SiteNav />
      <section className="shell py-12">
        <div className="mx-auto max-w-2xl rounded-[32px] border border-black/8 bg-white/92 p-8 shadow-[0_16px_60px_rgba(18,24,38,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-moss)]">
            {d.verifyEyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-[var(--color-ink)] sm:text-5xl">
            {isCouple ? d.verifyCoupleTitle : d.verifyPhotographerTitle}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-black/68">
            {t(d.verifyBody, { email })
              .split(email)
              .reduce<React.ReactNode[]>((acc, part, i, arr) => {
                acc.push(part);
                if (i < arr.length - 1)
                  acc.push(
                    <span key={i} className="font-semibold text-[var(--color-ink)]">
                      {email}
                    </span>,
                  );
                return acc;
              }, [])}
          </p>
          <div className="mt-6 rounded-[24px] border border-black/8 bg-[var(--color-paper)]/60 px-5 py-4 text-sm leading-6 text-black/70">
            {isCouple ? d.verifyNoteCouple : d.verifyNote}
          </div>
          <p className="mt-6 text-sm text-black/58">
            {d.wrongEmail}{" "}
            <Link
              href={`/${locale}/signup?intent=${intent}`}
              className="font-semibold text-[var(--color-accent)]"
            >
              {d.goBackSignup}
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
