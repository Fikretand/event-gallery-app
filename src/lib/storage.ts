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
    { expiresIn: 60 * 5 },
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
    { expiresIn: 60 * 5 },
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
