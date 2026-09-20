import { notFound } from "next/navigation";

import { locales, type Locale } from "@/lib/i18n/index";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // The root <html lang> is fixed at "en" because both languages are nested
  // under the same root layout. Marking the subtree here is what actually
  // reaches assistive technology: a screen reader switches voice on any
  // element carrying `lang`. `display: contents` keeps the wrapper out of the
  // layout entirely, so no styling changes.
  return (
    <div lang={locale} className="contents">
      {children}
    </div>
  );
}
