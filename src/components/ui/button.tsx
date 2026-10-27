"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger" | "danger-quiet";
    fullWidth?: boolean;
    /** App screens use the 40px control; marketing pages the 48px one. */
    size?: "md" | "sm";
  }
>;

// The recipes live in globals.css (.btn-*), so a <Link> styled as a button
// and a real <button> are the same control in every state.
const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-quiet",
  danger: "btn-danger",
  "danger-quiet": "btn-danger-quiet",
};

export function Button({
  children,
  className,
  variant = "primary",
  fullWidth = false,
  size = "sm",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn("btn", size === "sm" && "btn-sm", variants[variant], fullWidth && "w-full", className)}
      {...props}
    >
      {children}
    </button>
  );
}
