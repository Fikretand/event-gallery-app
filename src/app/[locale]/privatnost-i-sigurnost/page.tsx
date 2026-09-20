import type { Metadata } from "next";
import Link from "next/link";

import { ContentCta, ContentShell } from "@/components/content-page";
import { Panel } from "@/components/ui/panel";
import { getDictionary, type Locale } from "@/lib/i18n/index";
import { publicMetadata } from "@/lib/seo";

/**
 * An honest account of what "private gallery" means here.
 *
 * Distinct from `/privacy`, which is the legal policy. This page explains the
 * mechanics — unlisted link, optional PIN, expiring media URLs — including the
 * part most products leave out: without a PIN, whoever holds the link is in.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const p = getDictionary(locale as Locale).content.privacy;
  return publicMetadata({
    locale: locale as Locale,
    path: "/privatnost-i-sigurnost",
    title: p.seoTitle,
    description: p.seoDescription,
  });
}

export default async function PrivacyExplainerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = getDictionary(locale as Locale).content;
  const p = c.privacy;

  return (
    <ContentShell
      title={p.title}
      body={p.body}
      trail={[{ label: c.breadcrumbHome, href: `/${locale}` }, { label: p.seoTitle }]}
    >
      <section className="shell grid gap-4 py-4 md:grid-cols-2">
        {p.sections.map((section) => (
          <div key={section.title} className="rounded-[24px] border border-black/8 bg-white/80 p-6">
            <h2 className="text-base font-semibold text-[var(--color-ink)]">{section.title}</h2>
            <p className="mt-2.5 text-sm leading-6 text-black/65">{section.body}</p>
          </div>
        ))}
      </section>

      <section className="shell py-4">
        <Panel className="bg-white/85">
          <p className="text-sm leading-6 text-black/60">
            {p.legalNote}{" "}
            <Link
              href={`/${locale}/privacy`}
              className="font-semibold text-[var(--color-ink)] underline underline-offset-4"
            >
              {p.legalLink}
            </Link>
          </p>
        </Panel>
      </section>

      <ContentCta locale={locale as Locale} />
    </ContentShell>
  );
}
