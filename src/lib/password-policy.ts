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

export function passwordMeetsPolicy(password: string) {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    hasSymbol(password)
  );
}
