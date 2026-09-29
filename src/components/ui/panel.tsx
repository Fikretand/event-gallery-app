import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  id,
}: PropsWithChildren<{
  className?: string;
  id?: string;
}>) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[28px] border border-black/10 bg-white/85 p-6 shadow-[0_24px_80px_rgba(18,24,38,0.08)] backdrop-blur",
        className,
      )}
    >
      {children}
    </section>
  );
}
