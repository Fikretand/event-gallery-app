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

export function resolveAccountRedirect(accountType: AccountType, options?: { eventSlug?: string | null }) {
  if (accountType === "couple") {
    return options?.eventSlug ? `/dashboard/events/${options.eventSlug}` : "/dashboard/events/new?intent=couple";
  }

  return "/dashboard";
}
