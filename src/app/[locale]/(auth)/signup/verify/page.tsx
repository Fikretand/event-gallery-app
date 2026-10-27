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
    <main className="min-h-dvh">
      <SiteNav />
      <section className="shell py-[var(--space-3xl)]">
        <div className="max-w-2xl">
          <h1 className="display-s text-ink">
            {isCouple ? d.verifyCoupleTitle : d.verifyPhotographerTitle}
          </h1>
          <p className="lead mt-[var(--space-lg)] max-w-xl">
            {t(d.verifyBody, { email })
              .split(email)
              .reduce<React.ReactNode[]>((acc, part, i, arr) => {
                acc.push(part);
                if (i < arr.length - 1)
                  acc.push(
                    <span key={i} className="font-semibold text-ink">
                      {email}
                    </span>,
                  );
                return acc;
              }, [])}
          </p>
          <div className="notice notice-info mt-[var(--space-lg)] text-[0.9375rem]">
            {isCouple ? d.verifyNoteCouple : d.verifyNote}
          </div>
          <p className="mt-[var(--space-lg)] text-ink-2">
            {d.wrongEmail}{" "}
            <Link
              href={`/${locale}/signup?intent=${intent}`}
              className="link"
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
