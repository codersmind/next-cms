/**
 * Use field "name" for form/API keys; use "label" (display name) for UI.
 * When no label is set, fall back to name.
 */
export function getFieldLabel(attr: { name: string; label?: string }): string {
  const l = attr.label != null ? String(attr.label).trim() : "";
  return l || attr.name;
}

const SYSTEM_COLUMN_LABELS: Record<string, string> = {
  status: "Status",
  documentId: "Document ID",
  publishedAt: "Published at",
  createdAt: "Created at",
  updatedAt: "Updated at",
};

/**
 * Display label for a list column (attribute or system column).
 */
export function getColumnLabel(
  colId: string,
  attributes: { name: string; label?: string }[]
): string {
  const system = SYSTEM_COLUMN_LABELS[colId];
  if (system) return system;
  const attr = attributes.find((a) => a.name === colId);
  return attr ? getFieldLabel(attr) : colId;
}
