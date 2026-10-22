/**
 * Remembers, per event and per device, which files have already been sent, so
 * a guest who taps "choose photos" twice and picks the same pictures does not
 * send them again. Matching is by name + size + last-modified time: the same
 * photo picked from the same phone, not a check of the bytes.
 *
 * It lives in localStorage because there is no guest account to hang it on.
 * Storage can be missing or throw (private mode, blocked site data); then
 * nothing is remembered and every file goes through, as before.
 */

/** Oldest entries are dropped beyond this, so the list cannot grow for ever. */
export const SENT_FINGERPRINT_LIMIT = 2000;

type FileLike = { name: string; size: number; lastModified: number };
type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function fileFingerprint(file: FileLike) {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export function sentStorageKey(scope: string) {
  return `confetti-sent:${scope}`;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readSentFingerprints(scope: string, storage: StorageLike | null = defaultStorage()): Set<string> {
  if (!storage) return new Set();
  try {
    const parsed: unknown = JSON.parse(storage.getItem(sentStorageKey(scope)) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
  } catch {
    return new Set();
  }
}

export function rememberSentFingerprints(
  scope: string,
  fingerprints: string[],
  storage: StorageLike | null = defaultStorage(),
) {
  if (!storage || fingerprints.length === 0) return;
  try {
    const list = [...readSentFingerprints(scope, storage)].filter((value) => !fingerprints.includes(value));
    list.push(...fingerprints);
    storage.setItem(sentStorageKey(scope), JSON.stringify(list.slice(-SENT_FINGERPRINT_LIMIT)));
  } catch {
    // Quota or blocked storage: the upload already succeeded, only the memory is lost.
  }
}

/** Splits a pick into files not sent before and files this device already sent. */
export function splitAlreadySent<T extends FileLike>(files: T[], sent: Set<string>) {
  const fresh: T[] = [];
  const duplicates: T[] = [];
  for (const file of files) {
    (sent.has(fileFingerprint(file)) ? duplicates : fresh).push(file);
  }
  return { fresh, duplicates };
}
