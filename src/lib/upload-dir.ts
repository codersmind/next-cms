import { mkdir } from "fs/promises";
import path from "path";

/** Absolute filesystem path for media uploads (persistent across deploys). */
export function getUploadDir(): string {
  const raw = process.env.UPLOAD_DIR?.trim() || "uploads";
  return path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(process.cwd(), raw);
}

export async function ensureUploadDir(): Promise<string> {
  const dir = getUploadDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Default max upload size (10 MB). Override with UPLOAD_MAX_BYTES. */
export function getUploadMaxBytes(): number {
  const n = Number.parseInt(process.env.UPLOAD_MAX_BYTES ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 10 * 1024 * 1024;
}
