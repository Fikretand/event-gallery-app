import { cn } from "@/lib/utils";

/**
 * The "Otisak" mark: an instant-print frame in ink with a terracotta window,
 * its bottom edge heavier like the print's. Decorative; the wordmark beside
 * it (or the title it sits next to) carries the name.
 */
export function PrintMark({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "box-border inline-block flex-none rounded-[2px] border-solid border-ink bg-accent-light",
        size === "sm" && "h-[17px] w-[14px] border-x-[1.8px] border-t-[1.8px] border-b-[5px]",
        size === "md" && "h-[19px] w-4 border-x-2 border-t-2 border-b-[6px]",
        size === "lg" && "h-[22px] w-[18px] border-x-[2.4px] border-t-[2.4px] border-b-[6.8px]",
        className,
      )}
    />
  );
}

export function ConfettiWordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center", size === "lg" ? "gap-[7px]" : "gap-1.5")}>
      <PrintMark size={size} />
      <span
        className={cn(
          "font-display font-semibold leading-none tracking-[-0.025em] text-ink",
          size === "lg" ? "text-[22px]" : "text-[20px]",
        )}
      >
        Confetti
      </span>
    </span>
  );
}

/** The cover photo in its print: a paper border, heavier at the bottom. */
export function PrintFrame({
  src,
  alt,
  width,
  ratio,
  tilted = false,
  position,
  className,
}: {
  src: string;
  alt: string;
  /** Outer width in px; the border is 5% of it, the bottom 15%. */
  width: number;
  ratio: number;
  tilted?: boolean;
  position?: string;
  className?: string;
}) {
  const edge = width * 0.05;
  return (
    <div
      className={cn(
        "box-border bg-paper shadow-print",
        tilted && "-rotate-[1.5deg]",
        className,
      )}
      style={{ width, maxWidth: "100%", padding: `${edge}px ${edge}px ${edge * 3}px` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="block w-full bg-paper-3 object-cover"
        style={{ aspectRatio: String(ratio), objectPosition: position }}
      />
    </div>
  );
}
