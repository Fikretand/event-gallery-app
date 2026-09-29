import type { ReactNode } from "react";

import { EventShell } from "@/components/event-shell";

export default async function EventLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <EventShell locale="en" slug={slug}>
      {children}
    </EventShell>
  );
}
