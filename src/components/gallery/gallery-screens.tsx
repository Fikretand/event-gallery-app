import { ConfettiWordmark, PrintFrame } from "@/components/gallery/confetti-mark";
import { LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/** A closed gallery: the title, why, and who can help. Nothing to do here. */
export function ClosedScreen({
  title,
  dateLabel,
  reason,
  hint,
}: {
  title: string;
  dateLabel: string | null;
  reason: string;
  hint: string;
}) {
  return (
    <div className="mx-auto box-border flex min-h-dvh max-w-[1440px] flex-col px-6 pb-12 pt-3 md:px-16 md:pb-16 md:pt-6">
      <ConfettiWordmark />
      <div className="flex max-w-[460px] flex-1 flex-col justify-center py-12">
        <h1 className="font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.025em]">{title}</h1>
        {dateLabel ? <p className="mt-1.5 font-display text-[22px] italic leading-tight text-accent-deep">{dateLabel}</p> : null}
        <div role="status" className="mt-7 flex items-start gap-2.5 rounded-[10px] bg-paper-2 px-4 py-3.5 text-[15px]">
          <LockIcon className="mt-px h-5 w-5" />
          <span>
            <strong className="font-semibold">{reason}</strong>
            <br />
            <span className="text-ink-2">{hint}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** The invitation: the cover in its print (the one tilted photo), then the PIN. */
export function PinScreen({
  title,
  dateLabel,
  cover,
  privateLabel,
  enterPin,
  form,
}: {
  title: string;
  dateLabel: string | null;
  cover: { src: string } | null;
  privateLabel: string;
  enterPin: string;
  form: React.ReactNode;
}) {
  return (
    <div className="mx-auto box-border flex min-h-dvh max-w-[1440px] flex-col px-6 pb-12 pt-3 md:px-16 md:pb-0 md:pt-0">
      <header className="flex items-center md:h-[72px]">
        <span className="md:hidden">
          <ConfettiWordmark />
        </span>
        <span className="hidden md:inline">
          <ConfettiWordmark size="lg" />
        </span>
      </header>

      {/* Without a cover photo the form stands alone: an empty frame took
          half a phone screen and pushed the PIN field out of sight. */}
      <div className="flex flex-1 flex-col md:grid md:grid-cols-2 md:items-center md:gap-8 md:pb-[72px]">
        {cover ? (
          <div className="flex justify-center pb-1 pt-8 md:p-0">
            <PrintFrame src={cover.src} alt="" width={212} ratio={4 / 5} tilted position="50% 30%" className="md:hidden" />
            <PrintFrame src={cover.src} alt="" width={380} ratio={4 / 5} tilted position="50% 30%" className="hidden md:block" />
          </div>
        ) : null}

        <div
          className={cn(
            "mt-7 flex flex-col items-center text-center md:mt-0 md:max-w-[400px] md:items-start md:text-left",
            !cover && "md:col-span-2 md:mx-auto md:w-full",
          )}
        >
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss">
            <LockIcon className="h-4 w-4" />
            {privateLabel}
          </p>
          <h1 className="mt-2.5 font-display text-[40px] font-semibold leading-[1.05] tracking-[-0.025em] md:mt-3 md:text-[56px]">
            {title}
          </h1>
          {dateLabel ? (
            <p className="mt-1.5 font-display text-[22px] italic leading-tight text-accent-deep md:mt-2 md:text-[30px] md:text-accent">
              {dateLabel}
            </p>
          ) : null}
          <p className="mt-4 max-w-[30ch] text-base text-ink-2 [text-wrap:pretty] md:mt-5 md:max-w-none md:text-[17px] md:leading-[1.55]">
            {enterPin}
          </p>
          <div className="mt-6 w-full text-left md:mt-7">{form}</div>
        </div>
      </div>
    </div>
  );
}
