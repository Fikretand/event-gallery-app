import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

/** A card: the raised rung of the surface ladder, one per nesting level. */
export function Panel({
  children,
  className,
  id,
}: PropsWithChildren<{
  className?: string;
  id?: string;
}>) {
  return (
    <section id={id} className={cn("card p-6 sm:p-8", className)}>
      {children}
    </section>
  );
}
