/**
 * Model CRUD permission actions.
 * Super Admin role bypasses all checks (full access).
 */

export const SUPER_ADMIN_ROLE_NAME = "Super Admin";

/** Role names that cannot be deleted (system roles). */
export const PROTECTED_ROLE_NAMES = ["Super Admin", "Authenticated", "Public"] as const;

export function isProtectedRole(roleName: string): boolean {
  return PROTECTED_ROLE_NAMES.includes(roleName as (typeof PROTECTED_ROLE_NAMES)[number]);
}

export const CONTENT_TYPE_ACTIONS = ["find", "findOne", "create", "update", "delete"] as const;

/** Normalize pluralId so permission checks match stored actions (always lowercase). */
export function contentTypeAction(pluralId: string, action: string): string {
  const normalized = String(pluralId ?? "").trim().toLowerCase();
  return `content-type.${normalized}.${action}`;
}

/** System actions (not tied to a content type). */
export const SYSTEM_PERMISSIONS: { action: string; label: string; group: string }[] = [
  { action: "upload.create", label: "Upload files", group: "Upload & media" },
  { action: "upload.delete", label: "Delete files", group: "Upload & media" },
  { action: "media-folders.read", label: "List folders", group: "Upload & media" },
  { action: "media-folders.create", label: "Create folder", group: "Upload & media" },
  { action: "media-folders.delete", label: "Delete folder", group: "Upload & media" },
  { action: "content-types.read", label: "Read content types", group: "Content-Type Builder" },
  { action: "content-types.create", label: "Create content type", group: "Content-Type Builder" },
  { action: "content-types.update", label: "Update content type", group: "Content-Type Builder" },
  { action: "content-types.delete", label: "Delete content type", group: "Content-Type Builder" },
  { action: "admin.users", label: "Manage users", group: "Admin" },
  { action: "admin.roles", label: "Manage roles", group: "Admin" },
  { action: "admin.permissions", label: "Manage permissions", group: "Admin" },
];

export function getContentTypePermissionActions(pluralIds: string[]): { pluralId: string; action: string; label: string }[] {
  const out: { pluralId: string; action: string; label: string }[] = [];
  const actionLabels: Record<string, string> = {
    find: "List",
    findOne: "Read one",
    create: "Create",
    update: "Update",
    delete: "Delete",
  };
  for (const pluralId of pluralIds) {
    for (const a of CONTENT_TYPE_ACTIONS) {
      out.push({
        pluralId,
        action: contentTypeAction(pluralId, a),
        label: actionLabels[a] ?? a,
      });
    }
  }
  return out;
}
