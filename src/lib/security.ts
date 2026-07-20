import { cookies } from "next/headers";
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

const DEFAULT_SECRET = "confetti-dev-secret";

if (process.env.NODE_ENV === "production" && !env.appSecret) {
  throw new Error("APP_SECRET environment variable is required in production. Set it in your deployment environment.");
}

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

// PINs are hashed with salted scrypt (node:crypto — no native add-on, works on
// serverless). Format: "s1$<saltHex>$<keyHex>". Legacy unsalted SHA-256 hashes
// (64 hex chars, no "$") are still verified for backward compatibility and are
// upgraded to scrypt automatically the next time the PIN is set.
const SCRYPT_PREFIX = "s1";
const SCRYPT_KEYLEN = 32;

export function hashPin(pin: string) {
  const salt = randomBytes(16);
  const key = scryptSync(pin, salt, SCRYPT_KEYLEN);
  return `${SCRYPT_PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export function verifyPin(pin: string, hash: string | null | undefined) {
  if (!hash) {
    return !pin;
  }

  if (hash.startsWith(`${SCRYPT_PREFIX}$`)) {
    const [, saltHex, keyHex] = hash.split("$");
    if (!saltHex || !keyHex) {
      return false;
    }
    let derived: Buffer;
    try {
      derived = scryptSync(pin, Buffer.from(saltHex, "hex"), keyHex.length / 2);
    } catch {
      return false;
    }
    const target = Buffer.from(keyHex, "hex");
    if (derived.length !== target.length) {
      return false;
    }
    return timingSafeEqual(derived, target);
  }

  // Legacy unsalted SHA-256 hash — verified so existing PINs keep working.
  const digest = Buffer.from(sha256(pin));
  const target = Buffer.from(hash);
  if (digest.length !== target.length) {
    return false;
  }
  return timingSafeEqual(digest, target);
}

function galleryCookieValue(slug: string, pinHash: string | null) {
  const secret = env.appSecret ?? DEFAULT_SECRET;
  return sha256(`${slug}:${pinHash ?? "open"}:${secret}`);
}

export async function grantGalleryAccess(slug: string, pinHash: string | null) {
  const store = await cookies();
  store.set(`gallery_access_${slug}`, galleryCookieValue(slug, pinHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function hasGalleryAccess(slug: string, pinHash: string | null) {
  const store = await cookies();
  return store.get(`gallery_access_${slug}`)?.value === galleryCookieValue(slug, pinHash);
}

export function randomSlugSuffix() {
  return randomUUID().slice(0, 8);
}

export function hashIp(value: string | null) {
  if (!value) {
    return null;
  }

  const secret = env.appSecret ?? DEFAULT_SECRET;
  return sha256(`${value}:${secret}`);
}

// Upload-confirm grant. The HMAC binds the object key AND an expiry, so a
// leaked token can't be replayed indefinitely. The object key itself encodes
// `events/{eventId}/{guest|photographer}/…`, so the confirm route derives the
// event + source from the (signed) key instead of trusting the client.
const CONFIRM_TTL_MS = 15 * 60 * 1000; // uploads confirm within seconds; 15 min is generous

export function signUploadConfirmToken(objectKey: string, expiresAt?: number): string {
  const exp = expiresAt ?? Date.now() + CONFIRM_TTL_MS;
  const secret = env.appSecret ?? DEFAULT_SECRET;
  const mac = createHmac("sha256", secret).update(`${objectKey}|${exp}`).digest("hex");
  return `${exp}.${mac}`;
}

export function verifyUploadConfirmToken(objectKey: string, token: string): boolean {
  const dot = token.indexOf(".");
  if (dot <= 0) {
    return false;
  }
  const exp = Number(token.slice(0, dot));
  const mac = token.slice(dot + 1);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return false;
  }
  const secret = env.appSecret ?? DEFAULT_SECRET;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${objectKey}|${exp}`).digest("hex"));
  const received = Buffer.from(mac);
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}
