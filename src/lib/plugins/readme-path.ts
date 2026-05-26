/** Asset path for plugin readme markdown (served via /api/plugins/:id/assets/...). */
export function resolveReadmeAssetPath(readmeFile?: string): string {
  const raw = (readmeFile?.trim() || "README.md").replace(/\\/g, "/");
  if (!raw) return "README.md";
  if (raw.includes("..") || raw.startsWith("/")) {
    throw new Error("readmeFile must be a relative path");
  }
  if (raw === "README.md" || raw.toLowerCase() === "readme.md") {
    return "README.md";
  }
  let file = raw;
  if (!file.toLowerCase().endsWith(".md")) {
    file = `${file}.md`;
  }
  if (file.startsWith("admin/")) return file;
  return `admin/${file}`;
}
