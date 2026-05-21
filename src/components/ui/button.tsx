"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    fullWidth?: boolean;
  }
>;

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--color-ink)] text-white hover:bg-[color-mix(in_srgb,var(--color-ink)_85%,black)]",
  secondary:
    "bg-white text-[var(--color-ink)] ring-1 ring-black/10 hover:bg-[var(--color-paper)]",
  ghost: "bg-transparent text-[var(--color-ink)] hover:bg-black/5",
  danger: "bg-[#8a1c1c] text-white hover:bg-[#6d1515]",
};

export function Button({
  children,
  className,
  variant = "primary",
  fullWidth = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
