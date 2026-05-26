import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  buildLocalServeUrl,
  buildProviderKey,
  buildS3ObjectKey,
  buildS3PublicUrl,
  shouldProxyS3ThroughApi,
} from "./config";
import type { MediaStorageProvider, MoveInput, UploadInput, UploadResult } from "./types";

let client: S3Client | null = null;

function getBucket(): string {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) throw new Error("S3_BUCKET is not set");
  return bucket;
}

function getClient(): S3Client {
  if (client) return client;
  const region = process.env.AWS_REGION?.trim() || "us-east-1";
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";
  client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle } : {}),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!.trim(),
    },
  });
  return client;
}

function publicUrlForKey(objectKey: string, folder: string, hash: string): string {
  if (shouldProxyS3ThroughApi()) {
    return buildLocalServeUrl(folder, hash);
  }
  return buildS3PublicUrl(objectKey);
}

export class S3MediaStorage implements MediaStorageProvider {
  readonly type = "s3" as const;

  async upload(input: UploadInput): Promise<UploadResult> {
    const objectKey = buildS3ObjectKey(input.folder, input.hash);
    await getClient().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: objectKey,
        Body: input.buffer,
        ContentType: input.mime,
      })
    );
    return {
      storage: "s3",
      providerKey: objectKey,
      url: publicUrlForKey(objectKey, input.folder, input.hash),
    };
  }

  async move(input: MoveInput): Promise<UploadResult> {
    const bucket = getBucket();
    const newKey = buildS3ObjectKey(input.toFolder, input.hash);
    const s3 = getClient();
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${input.providerKey}`,
        Key: newKey,
        MetadataDirective: "COPY",
      })
    );
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: input.providerKey,
      })
    );
    return {
      storage: "s3",
      providerKey: newKey,
      url: publicUrlForKey(newKey, input.toFolder, input.hash),
    };
  }

  async delete(providerKey: string): Promise<void> {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: providerKey,
      })
    );
  }

  async read(providerKey: string): Promise<Buffer> {
    const res = await getClient().send(
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: providerKey,
      })
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty S3 object");
    return Buffer.from(bytes);
  }
}

export function legacyS3Key(folder: string, hash: string): string {
  return buildS3ObjectKey(folder, hash);
}

export function providerKeyFromMedia(media: {
  storage: string;
  providerKey: string | null;
  folder: string;
  hash: string;
}): string {
  if (media.providerKey) return media.providerKey;
  if (media.storage === "s3") return legacyS3Key(media.folder, media.hash);
  return buildProviderKey(media.folder, media.hash);
}
