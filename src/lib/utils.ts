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

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value));
}

export function absoluteUrl(pathname: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-[#edf7f0] text-[#1f6b42]";
    case "archived":
    case "archived (warm)":
      return "bg-[#fff1ee] text-[#9e2f23]";
    case "archived (cold)":
      return "bg-[#ffe5df] text-[#8a1c1c]";
    case "archive failed":
    case "failed":
      return "bg-[#8a1c1c] text-white";
    case "archiving":
      return "bg-[#fff3df] text-[#9a5b14]";
    case "restoring":
    case "restore_pending":
    case "restore requested":
      return "bg-[#e8eefb] text-[#244f91]";
    case "expired":
      return "bg-[#fff0eb] text-[#8a1c1c]";
    case "draft":
      return "bg-[#eef2f8] text-[#35507a]";
    default:
      return "bg-[var(--color-paper)] text-[var(--color-ink)]";
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
