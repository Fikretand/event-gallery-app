"use client";

import { useCallback, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  showLabel: string;
  hideLabel: string;
  /** Shown under the field (the password rules) and kept on screen with it. */
  children?: ReactNode;
};

/**
 * A password field with a "Show / Hide" button inside it.
 *
 * - The button never takes focus from the field (pointer down is cancelled),
 *   so on a phone the keyboard stays open and the caret stays put.
 * - Shown as text, the field still turns off autocorrect and capitals, so the
 *   keyboard does not "fix" what was typed.
 * - While the field has focus, the field and whatever sits under it (the
 *   rules checklist) are scrolled above the on-screen keyboard. The keyboard
 *   only shrinks the visual viewport on iOS and recent Android Chrome, so the
 *   check uses `visualViewport`, not the window.
 */
export function PasswordInput({ label, showLabel, hideLabel, id, className, children, onFocus, onBlur, ...props }: PasswordInputProps) {
  const autoId = useId();
  const inputId = id ?? props.name ?? autoId;
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const reveal = useCallback(() => {
    const vv = window.visualViewport;
    const el = wrapRef.current;
    if (!vv || !el) return;
    const box = el.getBoundingClientRect();
    const margin = 16;
    const visibleTop = vv.offsetTop + margin;
    const visibleBottom = vv.offsetTop + vv.height - margin;
    if (box.bottom <= visibleBottom && box.top >= visibleTop) return;
    // Bring the bottom (the rules) into view, but never push the label off the top.
    const down = Math.min(box.bottom - visibleBottom, box.top - visibleTop);
    const up = box.top < visibleTop ? box.top - visibleTop : 0;
    const by = box.bottom > visibleBottom ? down : up;
    if (Math.abs(by) < 2) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollBy({ top: by, behavior: still ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    if (!focused) return;
    const vv = window.visualViewport;
    // After the keyboard has slid in; then again whenever it resizes.
    const timer = window.setTimeout(reveal, 350);
    vv?.addEventListener("resize", reveal);
    return () => {
      window.clearTimeout(timer);
      vv?.removeEventListener("resize", reveal);
    };
  }, [focused, reveal]);

  return (
    <div ref={wrapRef} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={inputId}
          type={visible ? "text" : "password"}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn("field pr-[6.5rem]", visible && "tracking-wide", className)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        <button
          type="button"
          aria-controls={inputId}
          aria-pressed={visible}
          // Keep the focus (and the phone keyboard) on the field.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-1 right-1 inline-flex min-w-[5.75rem] items-center justify-center gap-1.5 rounded-[calc(var(--radius-inner)-4px)] px-3 text-sm font-semibold text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-0"
        >
          {visible ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
          {visible ? hideLabel : showLabel}
        </button>
      </div>
      {children}
    </div>
  );
}
