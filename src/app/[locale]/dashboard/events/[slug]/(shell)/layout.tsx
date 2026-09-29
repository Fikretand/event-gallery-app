import type { ReactNode } from "react";

import { EventShell } from "@/components/event-shell";
import type { Locale } from "@/lib/i18n/index";

export default async function EventLocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  return (
    <EventShell locale={locale as Locale} slug={slug}>
      {children}
    </EventShell>
  );
}
