"use client";

import { useState, type ReactNode } from "react";

/**
 * A <details> whose initial state comes from the server but is then the
 * reader's. A plain `open={…}` prop would be re-applied on every refresh —
 * the gallery's upload panel closed itself the moment the first upload
 * made the gallery non-empty, taking the success message with it.
 */
export function Disclosure({
  defaultOpen,
  summary,
  className,
  children,
}: {
  defaultOpen: boolean;
  summary: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className={className} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      {summary}
      {children}
    </details>
  );
}
