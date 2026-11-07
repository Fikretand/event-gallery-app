"use client";

import { useActionState, useEffect, useState } from "react";

import { AlertIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface GalleryUnlockStrings {
  pinLabel: string;
  pinPlaceholder: string;
  unlocking: string;
  unlock: string;
  wrongPin: string;
  tooManyAttempts: string;
  /** "Again in {{time}}" under the lock-out notice. */
  retryIn: string;
}

const EN_DEFAULTS: GalleryUnlockStrings = {
  pinLabel: "Gallery PIN",
  pinPlaceholder: "PIN from the host",
  unlocking: "Unlocking…",
  unlock: "Unlock gallery",
  wrongPin: "That PIN isn't right. Check it and try again.",
  tooManyAttempts: "Too many attempts. Wait 15 minutes and try again.",
  retryIn: "Again in {{time}}",
};

/** The PIN limiter's window (GALLERY_UNLOCK_RATE_LIMIT). The countdown starts
 *  at the full window: it can only over-estimate, never let a guess bounce. */
const LOCK_MS = 15 * 60 * 1000;

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function GalleryUnlockForm({
  action,
  strings,
}: {
  action: (
    state: { error?: string } | undefined | void,
    formData: FormData,
  ) => Promise<{ error?: string } | void>;
  strings?: Partial<GalleryUnlockStrings>;
}) {
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [state, formAction, isPending] = useActionState(
    async (previous: { error?: string } | undefined | void, formData: FormData) => {
      const result = await action(previous, formData);
      if (result?.error === "GALLERY_PIN_RATE_LIMITED") {
        setNow(Date.now());
        setLockedUntil(Date.now() + LOCK_MS);
      }
      return result;
    },
    undefined,
  );
  const s: GalleryUnlockStrings = { ...EN_DEFAULTS, ...strings };
  const [pin, setPin] = useState("");
  // The error belongs to the attempt that caused it: typing again clears the
  // red edge, the next submit brings a fresh one.
  const [dismissed, setDismissed] = useState<typeof state>(undefined);

  const error = state && state !== dismissed ? state.error : undefined;
  const locked = lockedUntil !== null && lockedUntil > now;
  const wrong = !locked && error === "GALLERY_PIN_WRONG";
  const otherError = !locked && error && error !== "GALLERY_PIN_WRONG" && error !== "GALLERY_PIN_RATE_LIMITED" ? error : null;

  useEffect(() => {
    if (lockedUntil === null) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockedUntil) {
        setLockedUntil(null);
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [lockedUntil]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink">{s.pinLabel}</span>
        <input
          name="pin"
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\s/g, ""));
            setDismissed(state);
          }}
          // Plain text, not a password: everyone at the event shares this PIN,
          // so masking it only makes it harder to type off a printed card, and a
          // password field invites the phone to save it as a login.
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          disabled={locked}
          aria-invalid={wrong}
          placeholder={s.pinPlaceholder}
          className={cn(
            "box-border min-h-14 w-full rounded-[10px] border bg-card px-4 font-mono !text-[22px] tracking-[0.24em] text-ink",
            "placeholder:font-[family-name:var(--font-gallery)] placeholder:text-base placeholder:tracking-normal placeholder:text-muted",
            wrong ? "border-error" : "border-field-edge",
            locked && "opacity-55",
          )}
        />
      </label>

      {wrong ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-[10px] bg-error-soft px-4 py-3 text-sm text-error">
          <AlertIcon className="mt-px h-[18px] w-[18px]" />
          <span>{s.wrongPin}</span>
        </div>
      ) : null}
      {otherError ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-[10px] bg-error-soft px-4 py-3 text-sm text-error">
          <AlertIcon className="mt-px h-[18px] w-[18px]" />
          <span>{otherError}</span>
        </div>
      ) : null}
      {locked ? (
        <div role="alert" className="flex items-start gap-2.5 rounded-[10px] bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertIcon className="mt-px h-[18px] w-[18px]" />
          <span>
            {s.tooManyAttempts}
            <br />
            <strong className="font-semibold">{s.retryIn.replace("{{time}}", clock((lockedUntil ?? now) - now))}</strong>
          </span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || locked}
        aria-busy={isPending}
        className={cn(
          "min-h-[52px] cursor-pointer rounded-full border-0 bg-accent text-base font-semibold text-accent-ink transition-[filter] duration-[var(--dur-micro)] hover:brightness-105",
          (isPending || locked) && "cursor-default opacity-55",
        )}
      >
        {isPending ? s.unlocking : s.unlock}
      </button>
    </form>
  );
}
