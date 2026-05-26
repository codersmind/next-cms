import {
  getAvailableStorageTypes,
  getDefaultStorageType,
  isLocalStorageEnabled,
  isS3Configured,
  resolveStorageType,
} from "./config";
import { LocalMediaStorage } from "./local";
import { S3MediaStorage } from "./s3";
import type { MediaStorageProvider, StorageType } from "./types";

export type { StorageType, UploadResult } from "./types";
export {
  getAvailableStorageTypes,
  getDefaultStorageType,
  isLocalStorageEnabled,
  isS3Configured,
  resolveStorageType,
  buildLocalServeUrl,
} from "./config";
export { providerKeyFromMedia } from "./s3";

const localStorage = new LocalMediaStorage();
const s3Storage = new S3MediaStorage();

export function getMediaStorage(type: StorageType): MediaStorageProvider {
  if (type === "s3") {
    if (!isS3Configured()) throw new Error("S3 storage is not configured");
    return s3Storage;
  }
  return localStorage;
}

export function getStorageForMedia(media: { storage: string }): MediaStorageProvider {
  return getMediaStorage(media.storage === "s3" ? "s3" : "local");
}
