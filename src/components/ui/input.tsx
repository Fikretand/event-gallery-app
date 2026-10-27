import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

export function Input({ className, label, hint, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="flex flex-col gap-2" htmlFor={inputId}>
      <span className="field-label">{label}</span>
      <input id={inputId} className={cn("field", className)} {...props} />
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}
