import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env, hasR2 } from "@/lib/env";

function createR2Client() {
  if (!hasR2 || !env.r2AccountId || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
}

export async function createSignedUploadUrl(key: string, contentType: string) {
  if (!env.r2Bucket) {
    return null;
  }

  const client = createR2Client();
  if (!client) {
    return null;
  }

  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
      ContentType: contentType,
    }),
    // A batch is presigned up front (up to 150 files, 1 GB each) and then
    // uploaded sequentially, so this has to cover the whole transfer — at 5
    // minutes every file whose turn came late failed with a 403. The URL is
    // scoped to one random-UUID key with a fixed content type, so a longer
    // window is a cheap trade for uploads that actually finish.
    { expiresIn: 60 * 60 * 2 },
  );
}

/**
 * How long a signed URL stays byte-for-byte identical.
 *
 * A SigV4 signature covers the moment it was made, so signing with the wall
 * clock produces a brand-new URL on every render — and a browser cannot reuse
 * a cached image under a URL it has never seen. A gallery of 200 photos was
 * therefore re-downloaded in full on every page view, which on a phone at a
 * wedding is the whole cost of the page.
 *
 * Rounding the signing time down to a window makes every request inside that
 * window produce the same URL, so the browser can serve its cached copy.
 *
 * No explicit `Cache-Control` is attached: R2's support for the S3
 * `response-cache-control` override is not something this codebase has
 * verified, and an unsupported parameter would break every image at once.
 * It buys little anyway — with a stable URL and R2's `Last-Modified`, a
 * browser's heuristic freshness on a weeks-old photo already runs into days.
 */
const SIGNED_URL_CACHE_WINDOW_SECONDS = 15 * 60;

/**
 * Validity guaranteed to a URL minted at the *end* of a cache window.
 *
 * Gallery tiles are lazy-loaded, so a URL created at page load may not be
 * requested until the visitor scrolls to it; at five minutes those images
 * 403'd on any gallery left open or browsed slowly. The window is added on top
 * because a URL signed with a rounded-down timestamp has already spent part of
 * its life by the time it is handed out.
 */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** The start of the cache window the given moment falls in. */
function signingWindowStart(now = Date.now()): Date {
  const windowMs = SIGNED_URL_CACHE_WINDOW_SECONDS * 1000;
  return new Date(Math.floor(now / windowMs) * windowMs);
}

export async function createSignedDownloadUrl(key: string, downloadName?: string, bucket = env.r2Bucket) {
  if (!bucket) {
    return null;
  }

  const client = createR2Client();
  if (!client) {
    return null;
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: downloadName
        ? `attachment; filename="${downloadName.replace(/"/g, "")}"`
        : undefined,
    }),
    {
      expiresIn: SIGNED_URL_TTL_SECONDS + SIGNED_URL_CACHE_WINDOW_SECONDS,
      signingDate: signingWindowStart(),
    },
  );
}

export async function deleteStoredObject(key: string | null | undefined, bucket = env.r2Bucket) {
  if (!key || !bucket) {
    return;
  }

  const client = createR2Client();
  if (!client) {
    return;
  }

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function getStoredObjectBuffer(key: string, bucket = env.r2Bucket) {
  if (!bucket) {
    return null;
  }

  const client = createR2Client();
  if (!client) {
    return null;
  }

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );

  if (!response.Body) {
    return null;
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putStoredObject(key: string, body: Buffer, contentType: string, bucket = env.r2Bucket) {
  if (!bucket) {
    return null;
  }

  const client = createR2Client();
  if (!client) {
    return null;
  }

  try {
    return await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  } catch (err) {
    console.error("[R2] putStoredObject failed:", err);
    return null;
  }
}


export function publicMediaUrl(key: string | null) {
  if (!key) {
    return null;
  }

  return env.r2PublicBaseUrl ? `${env.r2PublicBaseUrl.replace(/\/$/, "")}/${key}` : null;
}
