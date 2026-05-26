/**
 * Ensures writable dirs exist before Next starts (production server.js).
 * Keep in sync with src/lib/upload-dir.ts and src/lib/plugins/paths.ts.
 */
const fs = require("fs");
const path = require("path");

function resolveFromCwd(envValue, fallback) {
  const raw = (envValue || fallback).trim();
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureRuntimeDirs() {
  const uploadDir = ensureDir(resolveFromCwd(process.env.UPLOAD_DIR, "uploads"));
  const pluginsDir = ensureDir(resolveFromCwd(process.env.PLUGINS_DIR, "plugins"));
  return { uploadDir, pluginsDir };
}

module.exports = { ensureRuntimeDirs, resolveFromCwd };
