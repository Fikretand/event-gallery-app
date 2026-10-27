import type { Metadata } from "next";
import Link from "next/link";

import { ContentCta, ContentShell, DocSections } from "@/components/content-page";
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
      locale={locale as Locale}
      title={p.title}
      body={p.body}
      trail={[{ label: c.breadcrumbHome, href: `/${locale}` }, { label: p.seoTitle }]}
    >
      <DocSections sections={p.sections.map((section) => ({ title: section.title, body: <p>{section.body}</p> }))} />

      <section className="shell">
        <p className="border-t border-rule pt-[var(--space-lg)] text-ink-2">
          {p.legalNote}{" "}
          <Link href={`/${locale}/privacy`} className="link">
            {p.legalLink}
          </Link>
        </p>
      </section>

      <ContentCta locale={locale as Locale} />
    </ContentShell>
  );
}
