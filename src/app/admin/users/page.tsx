"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { Users, Plus, Trash2, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useGetAdminUsersQuery,
  useGetAdminRolesQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
} from "@/store/api/cmsApi";
import toast from "react-hot-toast";

const SORT_FIELDS = ["email", "username", "firstname", "lastname", "createdAt", "blocked"] as const;
type SortField = (typeof SORT_FIELDS)[number];

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [roleId, setRoleId] = useState<string>("");
  const [blockedFilter, setBlockedFilter] = useState<"" | "active" | "blocked">("");

  const sort = `${sortField}:${sortDir}`;
  const blockedParam = blockedFilter === "active" ? false : blockedFilter === "blocked" ? true : undefined;

  const { data, isLoading } = useGetAdminUsersQuery({
    page,
    pageSize,
    search: search || undefined,
    sort,
    roleId: roleId || undefined,
    blocked: blockedParam,
  });

  const users = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const { data: roles } = useGetAdminRolesQuery();
  const [createUser] = useCreateAdminUserMutation();
  const [updateUser] = useUpdateAdminUserMutation();
  const [deleteUser] = useDeleteAdminUserMutation();
  const [modal, setModal] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    firstname: "",
    lastname: "",
    roleId: "" as string | null,
    blocked: false,
  });

  const applySearch = useCallback(() => {
    setSearch(searchInput.trim());
    setPage(1);
  }, [searchInput]);

  const handleSort = useCallback((field: SortField) => {
    setSortField(field);
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    setPage(1);
  }, []);

  const goToPage = useCallback((p: number) => {
    if (!pagination) return;
    const paged = Math.max(1, Math.min(p, pagination.pageCount));
    setPage(paged);
  }, [pagination]);

  const openCreate = () => {
    setForm({ email: "", username: "", password: "", firstname: "", lastname: "", roleId: "", blocked: false });
    setEditingId(null);
    setModal("create");
  };
  const openEdit = (u: { id: string; email: string; username?: string | null; firstname?: string | null; lastname?: string | null; roleId?: string | null; blocked?: boolean }) => {
    setForm({
      email: u.email,
      username: u.username ?? "",
      password: "",
      firstname: u.firstname ?? "",
      lastname: u.lastname ?? "",
      roleId: u.roleId ?? "",
      blocked: u.blocked ?? false,
    });
    setEditingId(u.id);
    setModal("edit");
  };
  const closeModal = () => {
    setModal("none");
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      toast.error("Email and password required.");
      return;
    }
    try {
      await createUser({
        email: form.email.trim(),
        username: form.username.trim() || undefined,
        password: form.password,
        firstname: form.firstname.trim() || undefined,
        lastname: form.lastname.trim() || undefined,
        roleId: form.roleId || null,
      }).unwrap();
      toast.success("User created.");
      closeModal();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
        ? (err.data as { error: string }).error
        : "Failed to create user.";
      toast.error(msg);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!form.email.trim()) {
      toast.error("Email required.");
      return;
    }
    try {
      await updateUser({
        id: editingId,
        email: form.email.trim(),
        username: form.username.trim() || undefined,
        password: form.password || undefined,
        firstname: form.firstname.trim() || undefined,
        lastname: form.lastname.trim() || undefined,
        roleId: form.roleId || null,
        blocked: form.blocked,
      }).unwrap();
      toast.success("User updated.");
      closeModal();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
        ? (err.data as { error: string }).error
        : "Failed to update user.";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete user ${email}?`)) return;
    try {
      await deleteUser(id).unwrap();
      toast.success("User deleted.");
    } catch {
      toast.error("Failed to delete user.");
    }
  };

  return (
    <div>
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-white">← Dashboard</Link>
      <div className="flex items-center justify-between mt-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-sm text-zinc-500">Manage admin users and roles.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500"
        >
          <Plus className="w-4 h-4" /> Add user
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search email, username, name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()}
              className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500"
            />
          </div>
          <button
            type="button"
            onClick={applySearch}
            className="px-3 py-2 rounded-lg bg-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-600"
          >
            Search
          </button>
        </div>
        <select
          value={roleId}
          onChange={(e) => { setRoleId(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
        >
          <option value="">All roles</option>
          {(roles ?? []).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={blockedFilter}
          onChange={(e) => { setBlockedFilter(e.target.value as "" | "active" | "blocked"); setPage(1); }}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-zinc-500">Loading…</div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-6 py-3">
                  <button type="button" onClick={() => handleSort("email")} className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1 hover:text-zinc-300">
                    Email {sortField === "email" && (sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </button>
                </th>
                <th className="text-left px-6 py-3">
                  <button type="button" onClick={() => handleSort("username")} className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1 hover:text-zinc-300">
                    Username {sortField === "username" && (sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </button>
                </th>
                <th className="text-left px-6 py-3">
                  <button type="button" onClick={() => handleSort("firstname")} className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1 hover:text-zinc-300">
                    Name {sortField === "firstname" && (sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </button>
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Role</th>
                <th className="text-left px-6 py-3">
                  <button type="button" onClick={() => handleSort("blocked")} className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1 hover:text-zinc-300">
                    Status {sortField === "blocked" && (sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </button>
                </th>
                <th className="text-left px-6 py-3">
                  <button type="button" onClick={() => handleSort("createdAt")} className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1 hover:text-zinc-300">
                    Created {sortField === "createdAt" && (sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
                  </button>
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-zinc-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-800/30">
                  <td className="px-6 py-3 text-sm text-white">{u.email}</td>
                  <td className="px-6 py-3 text-sm text-zinc-400">{u.username ?? "—"}</td>
                  <td className="px-6 py-3 text-sm text-zinc-400">
                    {[u.firstname, u.lastname].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-zinc-400">{(u as { roleName?: string }).roleName ?? "—"}</td>
                  <td className="px-6 py-3">
                    {u.blocked ? <span className="text-red-400 text-sm">Blocked</span> : <span className="text-zinc-500 text-sm">Active</span>}
                  </td>
                  <td className="px-6 py-3 text-sm text-zinc-400">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button type="button" onClick={() => openEdit(u)} className="text-indigo-400 hover:underline text-sm mr-3">Edit</button>
                    <button type="button" onClick={() => handleDelete(u.id, u.email)} className="text-red-400 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">No users found.</div>
          )}

          {pagination && pagination.pageCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-t border-zinc-800 bg-zinc-900/30">
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500">
                  Showing {(pagination.page - 1) * pagination.pageSize + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-sm"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>{n} per page</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 text-sm text-zinc-400">
                  Page {pagination.page} of {pagination.pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pageCount}
                  className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">{modal === "create" ? "Add user" : "Edit user"}</h2>
            <form onSubmit={modal === "create" ? handleCreate : handleUpdate} className="space-y-3">
              <label className="block text-sm text-zinc-400">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                required
              />
              <label className="block text-sm text-zinc-400">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
              />
              {modal === "create" && (
                <>
                  <label className="block text-sm text-zinc-400">Password *</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                    required={modal === "create"}
                  />
                </>
              )}
              {modal === "edit" && (
                <>
                  <label className="block text-sm text-zinc-400">New password (leave blank to keep)</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                    placeholder="••••••••"
                  />
                </>
              )}
              <label className="block text-sm text-zinc-400">First name</label>
              <input
                type="text"
                value={form.firstname}
                onChange={(e) => setForm((f) => ({ ...f, firstname: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
              />
              <label className="block text-sm text-zinc-400">Last name</label>
              <input
                type="text"
                value={form.lastname}
                onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
              />
              <label className="block text-sm text-zinc-400">Role</label>
              <select
                value={form.roleId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, roleId: e.target.value || null }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
              >
                <option value="">— No role —</option>
                {(roles ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {modal === "edit" && (
                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={form.blocked}
                    onChange={(e) => setForm((f) => ({ ...f, blocked: e.target.checked }))}
                    className="rounded border-zinc-600"
                  />
                  Blocked
                </label>
              )}
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
