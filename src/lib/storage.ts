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
    // Gallery tiles are lazy-loaded, so a URL minted at page load may not be
    // requested until the visitor scrolls to it. At 5 minutes those images
    // 403'd on any gallery left open or browsed slowly.
    { expiresIn: 60 * 60 },
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
