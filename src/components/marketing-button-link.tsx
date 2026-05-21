import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Tone = "accent" | "ink" | "ghost";

const toneClasses: Record<Tone, string> = {
  accent:
    "relative z-10 inline-flex items-center justify-center rounded-full bg-[var(--color-accent)] shadow-[0_16px_36px_rgba(226,121,82,0.24)] transition hover:-translate-y-0.5",
  ink: "relative z-10 inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] transition hover:-translate-y-0.5",
  ghost:
    "inline-flex items-center justify-center rounded-full border border-black/10 bg-white/80 text-[var(--color-ink)] transition hover:bg-white",
};

const toneStyles: Record<Tone, CSSProperties> = {
  accent: { color: "#ffffff" },
  ink: { color: "#ffffff" },
  ghost: { color: "var(--color-ink)" },
};

export function MarketingButtonLink({
  href,
  children,
  tone = "accent",
  className,
  external = false,
}: {
  href: string;
  children: ReactNode;
  tone?: Tone;
  className?: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className={cn("px-5 py-3 text-sm font-semibold", toneClasses[tone], className)}
      style={toneStyles[tone]}
    >
      <span style={toneStyles[tone]}>{children}</span>
    </Link>
  );
}
