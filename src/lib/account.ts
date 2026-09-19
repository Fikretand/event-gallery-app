import type { AccountType } from "@/lib/types";

export function normalizeAccountType(value: unknown): AccountType {
  return value === "couple" ? "couple" : "photographer";
}

export function isValidPublicProfileUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Where an account lands after login / email confirmation. Couples get their
 * own dashboard, which already handles both "no event yet" and "event exists".
 */
export function resolveAccountRedirect(accountType: AccountType) {
  if (accountType === "couple") {
    return "/dashboard/couple";
  }

  return "/dashboard";
}
