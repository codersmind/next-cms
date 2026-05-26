import type { StorageType } from "./types";

export function getDefaultStorageType(): StorageType {
  const v = process.env.UPLOAD_STORAGE?.trim().toLowerCase();
  return v === "s3" ? "s3" : "local";
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim()
  );
}

export function isLocalStorageEnabled(): boolean {
  return process.env.UPLOAD_DISABLE_LOCAL !== "true";
}

/** Which backends are available for uploads. */
export function getAvailableStorageTypes(): StorageType[] {
  const types: StorageType[] = [];
  if (isLocalStorageEnabled()) types.push("local");
  if (isS3Configured()) types.push("s3");
  if (types.length === 0) types.push("local");
  return types;
}

export function resolveStorageType(requested?: string | null): StorageType {
  const available = getAvailableStorageTypes();
  const want = requested?.trim().toLowerCase();
  if (want === "s3" || want === "local") {
    if (!available.includes(want)) {
      throw new Error(`Storage "${want}" is not configured`);
    }
    return want;
  }
  const def = getDefaultStorageType();
  if (available.includes(def)) return def;
  return available[0];
}

export function getS3Prefix(): string {
  const p = process.env.S3_PREFIX?.trim().replace(/^\/+|\/+$/g, "") ?? "";
  return p;
}

export function buildProviderKey(folder: string, hash: string): string {
  return folder ? `${folder}/${hash}` : hash;
}

export function buildLocalServeUrl(folder: string, hash: string): string {
  const rel = buildProviderKey(folder, hash);
  return `/api/upload/files/${rel}`;
}

export function buildS3ObjectKey(folder: string, hash: string): string {
  const prefix = getS3Prefix();
  const rel = buildProviderKey(folder, hash);
  return prefix ? `${prefix}/${rel}` : rel;
}

export function buildS3PublicUrl(objectKey: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (base) return `${base}/${objectKey}`;
  const bucket = process.env.S3_BUCKET!.trim();
  const region = process.env.AWS_REGION?.trim() || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
}

export function shouldProxyS3ThroughApi(): boolean {
  return !process.env.S3_PUBLIC_BASE_URL?.trim();
}
