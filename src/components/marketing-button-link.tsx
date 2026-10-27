import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Tone = "accent" | "ink" | "ghost";

// Same recipes as <Button>: one control, whether it is a link or a button.
const toneClasses: Record<Tone, string> = {
  accent: "btn-primary",
  ink: "btn-ink",
  ghost: "btn-secondary",
};

export function MarketingButtonLink({
  href,
  children,
  tone = "accent",
  className,
  external = false,
  "aria-label": ariaLabel,
}: {
  href: string;
  children: ReactNode;
  tone?: Tone;
  className?: string;
  external?: boolean;
  "aria-label"?: string;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      aria-label={ariaLabel}
      className={cn("btn", toneClasses[tone], className)}
    >
      {children}
    </Link>
  );
}
