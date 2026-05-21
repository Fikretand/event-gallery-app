import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ className, label, hint, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-ink)]" htmlFor={inputId}>
      <span>{label}</span>
      <input
        id={inputId}
        className={cn(
          "rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-black/35 focus:border-[var(--color-ink)] focus:ring-4 focus:ring-[var(--color-accent)]/20",
          className,
        )}
        {...props}
      />
      {hint ? <span className="text-xs font-normal text-black/55">{hint}</span> : null}
    </label>
  );
}
