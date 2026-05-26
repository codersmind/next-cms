import { mkdir, readFile, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import { assertInsideRoot } from "@/lib/security/path";
import { ensureUploadDir, getUploadDir } from "@/lib/upload-dir";
import {
  buildLocalServeUrl,
  buildProviderKey,
} from "./config";
import type { MediaStorageProvider, MoveInput, UploadInput, UploadResult } from "./types";

export class LocalMediaStorage implements MediaStorageProvider {
  readonly type = "local" as const;

  async upload(input: UploadInput): Promise<UploadResult> {
    const providerKey = buildProviderKey(input.folder, input.hash);
    const root = await ensureUploadDir();
    if (input.folder) {
      await mkdir(assertInsideRoot(root, input.folder), { recursive: true });
    } else {
      await mkdir(root, { recursive: true });
    }
    const filePath = assertInsideRoot(root, providerKey);
    await writeFile(filePath, input.buffer);
    return {
      storage: "local",
      providerKey,
      url: buildLocalServeUrl(input.folder, input.hash),
    };
  }

  async move(input: MoveInput): Promise<UploadResult> {
    const root = getUploadDir();
    const oldPath = assertInsideRoot(root, input.providerKey);
    const newKey = buildProviderKey(input.toFolder, input.hash);
    const newPath = assertInsideRoot(root, newKey);
    await mkdir(path.dirname(newPath), { recursive: true });
    await rename(oldPath, newPath);
    return {
      storage: "local",
      providerKey: newKey,
      url: buildLocalServeUrl(input.toFolder, input.hash),
    };
  }

  async delete(providerKey: string): Promise<void> {
    const root = getUploadDir();
    try {
      await unlink(assertInsideRoot(root, providerKey));
    } catch {
      /* missing file */
    }
  }

  async read(providerKey: string): Promise<Buffer> {
    const root = getUploadDir();
    return readFile(assertInsideRoot(root, providerKey));
  }
}
