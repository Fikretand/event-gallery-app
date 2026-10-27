import Link from "next/link";

import { getDictionary, type Locale } from "@/lib/i18n/index";

/**
 * The mast: the wordmark set large over the site's real links and one line
 * on what Confetti is. Shared by every marketing page so none of them is an
 * orphan the sitemap points at.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const d = getDictionary(locale).landing;
  const lp = (path: string) => `/${locale}${path}`;

  return (
    <footer className="border-t border-rule bg-paper-2">
      <div className="shell grid gap-10 py-[var(--space-3xl)] lg:grid-cols-12 lg:gap-[var(--gap-columns)]">
        <div className="lg:col-span-5">
          <p className="font-display text-[clamp(3rem,6vw,5rem)] font-semibold leading-none tracking-[-0.03em] text-ink">
            Confetti
          </p>
          <p className="mt-4 max-w-[32ch] text-ink-2">{d.footerTagline}</p>
        </div>
        <nav aria-label="Footer" className="lg:col-span-7">
          <ul className="grid grid-cols-1 gap-x-[var(--gap-columns)] gap-y-1 min-[420px]:grid-cols-2 sm:grid-cols-3">
            {d.footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={lp(link.href)}
                  className="inline-flex min-h-11 items-center text-ink-2 underline decoration-transparent underline-offset-4 transition-colors duration-[var(--dur-micro)] hover:text-ink hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
