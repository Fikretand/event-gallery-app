import { cn } from "@/lib/utils";
import { PASSWORD_RULES, passwordChecks, type PasswordRule } from "@/lib/password-policy";

/**
 * The password rule, ticked off while the person types.
 *
 * Each line starts grey and turns green the moment it is satisfied, and the box
 * itself turns green once every line is — the same moment the submit button
 * wakes up. It replaces a sentence under the field plus the same sentence again
 * in a red box after a failed submit, which asked people to parse a rule instead
 * of showing them which part they were missing.
 */
export function PasswordRequirements({
  id,
  password,
  labels,
}: {
  id: string;
  password: string;
  labels: Record<PasswordRule, string>;
}) {
  const checks = passwordChecks(password);
  const allMet = PASSWORD_RULES.every((rule) => checks[rule]);

  return (
    <ul
      id={id}
      className={cn(
        "-mt-1 grid gap-1.5 rounded-2xl border px-4 py-3 transition-colors sm:grid-cols-2",
        allMet ? "border-[var(--color-moss)]/30 bg-[#eef8f2]" : "border-black/8 bg-black/[0.02]",
      )}
    >
      {PASSWORD_RULES.map((rule) => {
        const met = checks[rule];
        return (
          <li
            key={rule}
            data-met={met}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              met ? "font-medium text-[var(--color-moss)]" : "text-black/50",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border text-[10px] leading-none transition-colors",
                met
                  ? "border-[var(--color-moss)] bg-[var(--color-moss)] text-white"
                  : "border-black/25 bg-white",
              )}
            >
              {met ? "✓" : ""}
            </span>
            {labels[rule]}
          </li>
        );
      })}
    </ul>
  );
}
