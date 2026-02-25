"use client";

import Link from "next/link";
import { useState } from "react";
import { Shield, Plus, Pencil, Trash2 } from "lucide-react";
import {
  useGetAdminRolesQuery,
  useCreateAdminRoleMutation,
  useUpdateAdminRoleMutation,
  useDeleteAdminRoleMutation,
} from "@/store/api/cmsApi";
import toast from "react-hot-toast";

export default function AdminRolesPage() {
  const { data: roles, isLoading } = useGetAdminRolesQuery();
  const [createRole] = useCreateAdminRoleMutation();
  const [updateRole] = useUpdateAdminRoleMutation();
  const [deleteRole] = useDeleteAdminRoleMutation();
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", type: "custom" });

  const openCreate = () => {
    setForm({ name: "", description: "", type: "custom" });
    setEditingId(null);
    setModal("create");
  };
  const openEdit = (r: { id: string; name: string; description?: string | null; type?: string | null }) => {
    setForm({ name: r.name, description: r.description ?? "", type: r.type ?? "custom" });
    setEditingId(r.id);
    setModal("edit");
  };
  const closeModal = () => {
    setModal("none");
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name required.");
      return;
    }
    try {
      await createRole({ name: form.name.trim(), description: form.description.trim() || undefined, type: form.type }).unwrap();
      toast.success("Role created.");
      closeModal();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
        ? (err.data as { error: string }).error
        : "Failed to create role.";
      toast.error(msg);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !form.name.trim()) return;
    try {
      await updateRole({ id: editingId, name: form.name.trim(), description: form.description.trim() || undefined, type: form.type }).unwrap();
      toast.success("Role updated.");
      closeModal();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
        ? (err.data as { error: string }).error
        : "Failed to update role.";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string, name: string, usersCount?: number) => {
    if (usersCount && usersCount > 0) {
      toast.error("Cannot delete role with users. Reassign or remove users first.");
      return;
    }
    if (!confirm(`Delete role "${name}"?`)) return;
    try {
      await deleteRole(id).unwrap();
      toast.success("Role deleted.");
    } catch {
      toast.error("Failed to delete role.");
    }
  };

  return (
    <div>
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
      <div className="flex items-center justify-between mt-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Roles</h1>
            <p className="text-sm text-zinc-500">Define roles and assign to users.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
        >
          <Plus className="w-4 h-4" /> Add role
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-zinc-500">Loading…</div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Users</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Permissions</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(roles ?? []).map((r) => (
                <tr key={r.id} className="hover:bg-zinc-800/30">
                  <td className="px-6 py-3 text-sm font-medium text-white">{r.name}</td>
                  <td className="px-6 py-3 text-sm text-zinc-400">{r.type ?? "—"}</td>
                  <td className="px-6 py-3 text-sm text-zinc-400">{r.description ?? "—"}</td>
                  <td className="px-6 py-3 text-sm text-zinc-400">{r.usersCount ?? 0}</td>
                  <td className="px-6 py-3 text-sm text-zinc-400">{r.permissionsCount ?? 0}</td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/admin/permissions?roleId=${r.id}`} className="text-indigo-400 hover:underline text-sm mr-3">Permissions</Link>
                    <button type="button" onClick={() => openEdit(r)} className="text-indigo-400 hover:underline text-sm mr-3">Edit</button>
                    <button type="button" onClick={() => handleDelete(r.id, r.name, r.usersCount)} className="text-red-400 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!roles || roles.length === 0) && (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">No roles yet.</div>
          )}
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">{modal === "create" ? "Add role" : "Edit role"}</h2>
            <form onSubmit={modal === "create" ? handleCreate : handleUpdate} className="space-y-3">
              <label className="block text-sm text-zinc-400">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                required
              />
              <label className="block text-sm text-zinc-400">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
              >
                <option value="custom">Custom</option>
                <option value="authenticated">Authenticated</option>
                <option value="public">Public</option>
              </select>
              <label className="block text-sm text-zinc-400">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
              />
              <div className="flex gap-2 pt-4">
                <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500">
                  {modal === "create" ? "Create" : "Save"}
                </button>
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border border-zinc-600 text-zinc-400 text-sm hover:bg-zinc-800">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
