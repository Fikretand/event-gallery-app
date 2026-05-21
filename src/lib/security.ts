import { cookies } from "next/headers";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

const DEFAULT_SECRET = "confetti-dev-secret";

if (process.env.NODE_ENV === "production" && !env.appSecret) {
  throw new Error("APP_SECRET environment variable is required in production. Set it in your deployment environment.");
}

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export function hashPin(pin: string) {
  return sha256(pin);
}

export function verifyPin(pin: string, hash: string | null | undefined) {
  if (!hash) {
    return !pin;
  }

  const digest = Buffer.from(hashPin(pin));
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

export function signUploadConfirmToken(objectKey: string): string {
  const secret = env.appSecret ?? DEFAULT_SECRET;
  return createHmac("sha256", secret).update(objectKey).digest("hex");
}

export function verifyUploadConfirmToken(objectKey: string, token: string): boolean {
  const expected = Buffer.from(signUploadConfirmToken(objectKey));
  const received = Buffer.from(token);
  if (expected.length !== received.length) {
    return false;
  }
  return timingSafeEqual(expected, received);
}
