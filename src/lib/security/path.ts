import path from "path";

/** Reject path segments that escape a root directory. */
export function assertInsideRoot(rootDir: string, ...segments: string[]): string {
  const root = path.resolve(rootDir);
  const resolved = path.resolve(root, ...segments);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    throw new Error("Path traversal denied");
  }
  return resolved;
}

/** Safe relative path for URL segments (decode once, block `..`). */
export function normalizeRelativePath(segments: string[]): string {
  const parts: string[] = [];
  for (const raw of segments) {
    const decoded = decodeURIComponent(raw);
    if (!decoded || decoded === "." || decoded === "..") {
      throw new Error("Invalid path segment");
    }
    if (decoded.includes("..") || decoded.includes("\\") || path.isAbsolute(decoded)) {
      throw new Error("Invalid path segment");
    }
    parts.push(decoded);
  }
  return parts.join("/");
}

/** Upload/media folder: `YYYY/MM` or single safe segment. */
export function sanitizeUploadFolder(folder: string | null | undefined): string {
  const raw = (folder ?? "").trim().replace(/\\/g, "/");
  if (!raw) {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*(\/[a-zA-Z0-9][a-zA-Z0-9._-]*)*$/.test(raw)) {
    throw new Error("Invalid folder name");
  }
  const segments = raw.split("/");
  for (const s of segments) {
    if (s === "." || s === "..") throw new Error("Invalid folder name");
  }
  return segments.join("/");
}
