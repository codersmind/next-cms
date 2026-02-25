"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { KeyRound } from "lucide-react";
import {
  useGetAdminPermissionsQuery,
  useGetAdminRolesQuery,
  useGetContentTypesQuery,
  useCreateAdminPermissionMutation,
  useDeleteAdminPermissionMutation,
  useUpdateAdminPermissionMutation,
} from "@/store/api/cmsApi";
import {
  SYSTEM_PERMISSIONS,
  contentTypeAction,
  CONTENT_TYPE_ACTIONS,
  SUPER_ADMIN_ROLE_NAME,
} from "@/lib/permissions";
import toast from "react-hot-toast";

export default function AdminPermissionsPage() {
  const searchParams = useSearchParams();
  const roleIdParam = searchParams.get("roleId") ?? "";
  const [selectedRoleId, setSelectedRoleId] = useState(roleIdParam);

  useEffect(() => {
    if (roleIdParam) setSelectedRoleId(roleIdParam);
  }, [roleIdParam]);

  const { data: roles } = useGetAdminRolesQuery();
  const { data: contentTypes } = useGetContentTypesQuery();
  const { data: permissions, isLoading } = useGetAdminPermissionsQuery(selectedRoleId || undefined);
  const [createPermission] = useCreateAdminPermissionMutation();
  const [updatePermission] = useUpdateAdminPermissionMutation();
  const [deletePermission] = useDeleteAdminPermissionMutation();

  const selectedRole = roles?.find((r) => r.id === selectedRoleId);
  const isSuperAdmin = selectedRole?.name === SUPER_ADMIN_ROLE_NAME;

  const permissionSet = useMemo(() => {
    const set = new Set<string>();
    (permissions ?? []).filter((p) => p.enabled).forEach((p) => set.add(p.action));
    return set;
  }, [permissions]);

  const hasPermission = (action: string) => isSuperAdmin || permissionSet.has(action);

  const handleToggle = async (action: string, currentlyEnabled: boolean) => {
    if (!selectedRoleId) return;
    if (isSuperAdmin) {
      toast("Super Admin has full access. Permissions are not used.", { icon: "ℹ️" });
      return;
    }
    const existing = (permissions ?? []).find((p) => p.action === action);
    try {
      if (currentlyEnabled) {
        if (existing) await updatePermission({ id: existing.id, enabled: false }).unwrap();
      } else {
        if (existing) await updatePermission({ id: existing.id, enabled: true }).unwrap();
        else await createPermission({ roleId: selectedRoleId, action, enabled: true }).unwrap();
      }
      toast.success(currentlyEnabled ? "Permission removed." : "Permission granted.");
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
        ? (err.data as { error: string }).error
        : "Failed to update permission.";
      toast.error(msg);
    }
  };

  const allGrantedForModel = (pluralId: string) =>
    CONTENT_TYPE_ACTIONS.every((action) => hasPermission(contentTypeAction(pluralId, action)));

  const handleToggleAllForModel = async (pluralId: string, grant: boolean) => {
    if (!selectedRoleId || isSuperAdmin) return;
    const permList = permissions ?? [];
    try {
      for (const action of CONTENT_TYPE_ACTIONS) {
        const actionKey = contentTypeAction(pluralId, action);
        const existing = permList.find((p) => p.action === actionKey);
        if (grant) {
          if (existing) await updatePermission({ id: existing.id, enabled: true }).unwrap();
          else await createPermission({ roleId: selectedRoleId, action: actionKey, enabled: true }).unwrap();
        } else {
          if (existing) await updatePermission({ id: existing.id, enabled: false }).unwrap();
        }
      }
      const modelName = contentTypes?.find((ct) => ct.pluralId === pluralId)?.name ?? pluralId;
      toast.success(grant ? `All permissions granted for ${modelName}.` : `All permissions removed for ${modelName}.`);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
        ? (err.data as { error: string }).error
        : "Failed to update permissions.";
      toast.error(msg);
    }
  };

  const systemByGroup = useMemo(() => {
    const map = new Map<string, { action: string; label: string }[]>();
    for (const p of SYSTEM_PERMISSIONS) {
      const list = map.get(p.group) ?? [];
      list.push({ action: p.action, label: p.label });
      map.set(p.group, list);
    }
    return map;
  }, []);

  return (
    <div>
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
      <div className="flex items-center gap-3 mt-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
          <KeyRound className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Permissions</h1>
          <p className="text-sm text-zinc-500">Model CRUD and system permissions per role. Super Admin has full access.</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Role</label>
        <select
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
        >
          <option value="">— Select role —</option>
          {(roles ?? []).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {selectedRoleId && (
        <>
          {isSuperAdmin && (
            <div className="mb-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-sm">
              <strong>Super Admin</strong> has full access to all models and admin. Permissions below are not applied for this role.
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-zinc-500">Loading…</div>
          ) : (
            <div className="space-y-8">
              {/* Content types CRUD */}
              {(contentTypes ?? []).length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                  <h2 className="px-6 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-400">Content types (model CRUD)</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Model</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase w-14">All</th>
                          {CONTENT_TYPE_ACTIONS.map((a) => (
                            <th key={a} className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase">
                              {a === "findOne" ? "Read one" : a === "find" ? "List" : a}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {(contentTypes ?? []).map((ct) => {
                          const rowAllChecked = allGrantedForModel(ct.pluralId);
                          return (
                            <tr key={ct.id} className="hover:bg-zinc-800/30">
                              <td className="px-6 py-3 text-sm font-medium text-white">{ct.name}</td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={rowAllChecked}
                                  disabled={isSuperAdmin}
                                  onChange={() => handleToggleAllForModel(ct.pluralId, !rowAllChecked)}
                                  className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                                  title={rowAllChecked ? `Remove all for ${ct.name}` : `Grant all for ${ct.name}`}
                                />
                              </td>
                              {CONTENT_TYPE_ACTIONS.map((action) => {
                                const actionKey = contentTypeAction(ct.pluralId, action);
                                const enabled = hasPermission(actionKey);
                                return (
                                  <td key={actionKey} className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={enabled}
                                      disabled={isSuperAdmin}
                                      onChange={() => handleToggle(actionKey, enabled)}
                                      className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* System permissions */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
                <h2 className="px-6 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-400">System & Admin</h2>
                <div className="p-6 space-y-6">
                  {Array.from(systemByGroup.entries()).map(([group, items]) => (
                    <div key={group}>
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase mb-2">{group}</h3>
                      <div className="flex flex-wrap gap-4">
                        {items.map(({ action, label }) => {
                          const enabled = hasPermission(action);
                          return (
                            <label key={action} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={enabled}
                                disabled={isSuperAdmin}
                                onChange={() => handleToggle(action, enabled)}
                                className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500"
                              />
                              <span className="text-sm text-zinc-300">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedRoleId && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500 text-sm">
          Select a role to view and manage its permissions.
        </div>
      )}
    </div>
  );
}
