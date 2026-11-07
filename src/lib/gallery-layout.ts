/**
 * Pure helpers behind the guest gallery ("Otisak" redesign): the justified
 * rows that respect each photo's orientation, the ZIP parts a big download is
 * split into, and the plural form a count takes. No DOM, so they are tested.
 */

export type LayoutItem = {
  id: string;
  width: number;
  height: number;
  /** A landscape photo picked to stand larger than its neighbours. */
  hero?: boolean;
};

export type LayoutRow<T extends LayoutItem> = {
  height: number;
  items: { item: T; width: number }[];
};

/** Photos without stored dimensions (videos, a HEIC with no thumbnail). */
export const FALLBACK_RATIO = 4 / 5;

export function ratioOf(item: { width: number | null; height: number | null }) {
  if (item.width && item.height && item.width > 0 && item.height > 0) {
    return item.width / item.height;
  }
  return FALLBACK_RATIO;
}

/**
 * Every 12th landscape photo or so stands larger: the rhythm of a printed
 * album rather than an even wall. Counting restarts in each chapter.
 */
export function markHeroes<T extends { width: number; height: number }>(items: T[], every = 11) {
  let since = Number.POSITIVE_INFINITY;
  return items.map((item) => {
    const landscape = item.width > item.height;
    if (landscape && since >= every) {
      since = 0;
      return { ...item, hero: true };
    }
    since += 1;
    return { ...item, hero: false };
  });
}

function makeRow<T extends LayoutItem>(row: T[], width: number, gap: number, cap: number): LayoutRow<T> {
  const ratioSum = row.reduce((sum, item) => sum + item.width / item.height, 0);
  let height = (width - gap * (row.length - 1)) / ratioSum;
  let full = true;
  if (height > cap) {
    height = cap;
    full = false;
  }
  height = Math.round(height);
  let widths = row.map((item) => (item.width / item.height) * height);

  if (full) {
    // Floor every width, then hand the leftover pixels out one by one so the
    // row ends exactly on the edge.
    const floored = widths.map(Math.floor);
    let rest = Math.floor(width - gap * (row.length - 1) - floored.reduce((a, b) => a + b, 0) + 1e-6);
    let k = 0;
    while (rest > 0) {
      floored[k % floored.length] += 1;
      rest -= 1;
      k += 1;
    }
    widths = floored;
  } else {
    widths = widths.map(Math.round);
  }

  return { height, items: row.map((item, index) => ({ item, width: widths[index] })) };
}

/**
 * Justified rows: fill each row until it reaches `width` at the target height,
 * then scale it to fit exactly. A hero photo sits alone (when that keeps it
 * modest) or leads a taller row. A short last row keeps the target height
 * instead of being blown up.
 */
export function justifiedRows<T extends LayoutItem>(
  list: T[],
  width: number,
  target: number,
  gap: number,
  maxPerRow: number,
): LayoutRow<T>[] {
  const rows: LayoutRow<T>[] = [];
  if (width <= 0) return rows;
  let i = 0;

  while (i < list.length) {
    const first = list[i];

    if (first.hero) {
      const ratio = first.width / first.height;
      if (width / ratio <= target * 2.2) {
        rows.push(makeRow([first], width, gap, Number.POSITIVE_INFINITY));
        i += 1;
        continue;
      }
      const row = [first];
      let ratioSum = ratio;
      let j = i + 1;
      const tall = target * 1.7;
      while (j < list.length && ratioSum * tall + gap * (row.length - 1) < width && !list[j].hero) {
        row.push(list[j]);
        ratioSum += list[j].width / list[j].height;
        j += 1;
      }
      rows.push(makeRow(row, width, gap, tall * 1.25));
      i = j;
      continue;
    }

    const row: T[] = [];
    let ratioSum = 0;
    let j = i;
    while (j < list.length && !list[j].hero && row.length < maxPerRow) {
      row.push(list[j]);
      ratioSum += list[j].width / list[j].height;
      j += 1;
      if (ratioSum * target + gap * (row.length - 1) >= width) break;
    }
    rows.push(makeRow(row, width, gap, target * 1.35));
    i = j;
  }

  return rows;
}

/** The per-request ceilings of `/api/media/download-batch`. */
export const ZIP_PART_MAX_BYTES = 300 * 1024 * 1024;
export const ZIP_PART_MAX_FILES = 500;

export type ZipPart = { ids: string[]; bytes: number };

/**
 * Splits a download into parts the ZIP route accepts: each under the byte
 * and file ceilings, in gallery order. A single file larger than the byte
 * ceiling gets a part of its own (it downloads directly, not as a ZIP).
 */
export function splitIntoZipParts(
  items: { id: string; size_bytes: number }[],
  maxBytes = ZIP_PART_MAX_BYTES,
  maxFiles = ZIP_PART_MAX_FILES,
): ZipPart[] {
  const parts: ZipPart[] = [];
  let current: ZipPart = { ids: [], bytes: 0 };
  for (const item of items) {
    const size = Math.max(0, item.size_bytes || 0);
    if (current.ids.length > 0 && (current.bytes + size > maxBytes || current.ids.length >= maxFiles)) {
      parts.push(current);
      current = { ids: [], bytes: 0 };
    }
    current.ids.push(item.id);
    current.bytes += size;
  }
  if (current.ids.length > 0) parts.push(current);
  return parts;
}

export type PluralForm = "one" | "few" | "many";

/**
 * Bosnian plural: 1, 21, 31… take "one"; 2–4, 22–24… take "few"; the rest
 * (and 11–14) take "many". English only ever needs "one" and "many", and its
 * dictionary repeats the "many" text under "few".
 */
export function pluralForm(count: number): PluralForm {
  const n = Math.abs(Math.trunc(count));
  const lastTwo = n % 100;
  const last = n % 10;
  if (last === 1 && lastTwo !== 11) return "one";
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "few";
  return "many";
}

/** "1:05" from seconds. */
export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** "1,1 GB" / "298 MB" — the decimal comma follows the locale. */
export function formatSize(bytes: number, locale: "en" | "bs") {
  const mb = bytes / (1024 * 1024);
  const number = (value: number, digits: number) =>
    new Intl.NumberFormat(locale === "bs" ? "bs-BA" : "en", { maximumFractionDigits: digits }).format(value);
  if (mb >= 1024) return `${number(mb / 1024, 1)} GB`;
  return `${number(Math.max(1, Math.round(mb)), 0)} MB`;
}
