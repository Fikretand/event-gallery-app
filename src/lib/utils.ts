export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

/**
 * `locale` is optional so the existing call sites keep their English output;
 * pass "bs" to get 30. 9. 2026. on Bosnian pages instead of Sep 30, 2026.
 */
export function formatDate(value: string | null | undefined, locale: "en" | "bs" = "en", emptyLabel = "Not set") {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(locale === "bs" ? "bs-BA" : "en", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value));
}

export function absoluteUrl(pathname: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

/** The chip colour for an event or media status, from the theme's state tokens. */
export function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "chip-moss";
    case "archived":
    case "archived (warm)":
    case "archived (cold)":
    case "expired":
      return "chip-error";
    case "archive failed":
    case "failed":
      return "bg-error text-accent-ink";
    case "archiving":
    case "restoring":
    case "restore_pending":
    case "restore requested":
      return "chip-warning";
    default:
      return "";
  }
}

export function formatDaysUntilPurge(value: string | null | undefined, retentionDays = 7) {
  if (!value) {
    return null;
  }

  const deletedAt = new Date(value).getTime();
  if (Number.isNaN(deletedAt)) {
    return null;
  }

  const purgeAt = deletedAt + retentionDays * 24 * 60 * 60 * 1000;
  const diff = purgeAt - Date.now();

  if (diff <= 0) {
    return "Eligible for permanent deletion now";
  }

  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return `Permanently deleted in ${days} day${days === 1 ? "" : "s"}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
