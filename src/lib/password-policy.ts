/**
 * The password rule, in one place.
 *
 * Supabase enforces this server-side (Auth → Sign In / Providers → Email →
 * Password Requirements), which is what actually protects the account. What
 * this module adds is a matching check in our own code, so the person gets a
 * sentence in their own language instead of Supabase's English error — and so
 * signup stops being the one path with no check at all.
 *
 * Keep it in step with the dashboard setting. If the two drift, the app will
 * wave a password through and Supabase will reject it, which reads as a bug.
 */

export const PASSWORD_MIN_LENGTH = 8;

/** The exact set Supabase accepts; anything outside it would be refused there. */
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";

/** Returned by the auth actions so the form can translate it. */
export const WEAK_PASSWORD = "WEAK_PASSWORD";

const hasSymbol = (password: string) =>
  password.split("").some((char) => PASSWORD_SYMBOLS.includes(char));

/** The rules in the order the form lists them. */
export const PASSWORD_RULES = ["length", "upper", "lower", "digit", "symbol"] as const;
export type PasswordRule = (typeof PASSWORD_RULES)[number];

/** Each rule on its own, so the form can tick them off as the person types. */
export function passwordChecks(password: string): Record<PasswordRule, boolean> {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: hasSymbol(password),
  };
}

export function passwordMeetsPolicy(password: string) {
  const checks = passwordChecks(password);
  return PASSWORD_RULES.every((rule) => checks[rule]);
}
