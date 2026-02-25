"use client";

import {
  useGetMediaQuery,
  useGetMediaFoldersQuery,
  useCreateMediaFolderMutation,
  useDeleteMediaFolderMutation,
  useUploadMediaMutation,
  useDeleteMediaMutation,
  useMoveMediaMutation,
} from "@/store/api/cmsApi";
import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Image, Upload, FileText, Trash2, FolderPlus, Folder } from "lucide-react";

export default function MediaLibraryPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [addFolderName, setAddFolderName] = useState("");
  const [addFolderParentPath, setAddFolderParentPath] = useState<string>("");
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [drag, setDrag] = useState(false);
  const [confirmFolderId, setConfirmFolderId] = useState<string | null>(null);

  const { data: files, isLoading } = useGetMediaQuery(selectedFolder ?? undefined);
  const { data: folders } = useGetMediaFoldersQuery();
  const [upload, { isLoading: uploading }] = useUploadMediaMutation();
  const [createFolder, { isLoading: creatingFolder }] = useCreateMediaFolderMutation();
  const [deleteFolder, { isLoading: deletingFolder }] = useDeleteMediaFolderMutation();
  const [deleteMedia, { isLoading: deleting }] = useDeleteMediaMutation();
  const [moveMedia, { isLoading: moving }] = useMoveMediaMutation();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [uploadToFolder, setUploadToFolder] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  function folderDisplayLabel(f: { name: string; path: string }) {
    return f.path.includes("/") ? f.path.replace(/\//g, " / ") : f.name;
  }

  async function handleDeleteFolder(id: string) {
    try {
      await deleteFolder(id).unwrap();
      if (folders?.find((f) => f.id === id)?.path === selectedFolder) setSelectedFolder(null);
      setConfirmFolderId(null);
      toast.success("Folder deleted.");
    } catch {
      toast.error("Failed to delete folder.");
      setConfirmFolderId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMedia(id).unwrap();
      setConfirmId(null);
      toast.success("Deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  }

  async function handleMove(mediaId: string, folderPath: string) {
    try {
      await moveMedia({ id: mediaId, folder: folderPath }).unwrap();
      toast.success(folderPath ? "Moved to folder." : "Moved to root.");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
          ? (err.data as { error: string }).error
          : "Failed to move.";
      toast.error(msg);
    }
  }

  async function handleAddFolder() {
    const name = addFolderName.trim();
    if (!name) return;
    try {
      await createFolder({
        name,
        parentPath: addFolderParentPath || undefined,
      }).unwrap();
      toast.success(`Folder "${name}" created.`);
      setAddFolderName("");
      setAddFolderParentPath("");
      setShowAddFolder(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
          ? (err.data as { error: string }).error
          : "Failed to create folder.";
      toast.error(msg);
    }
  }

  async function handleFile(filesList: FileList | null) {
    if (!filesList?.length) return;
    const formData = new FormData();
    for (let i = 0; i < filesList.length; i++) {
      formData.append("files", filesList[i]);
    }
    if (uploadToFolder) {
      formData.set("folder", uploadToFolder);
    }
    try {
      await upload(formData).unwrap();
      toast.success("File(s) uploaded.");
      if (uploadToFolder) setSelectedFolder(uploadToFolder);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string"
          ? (err.data as { error: string }).error
          : "Upload failed. Check that the server can create the uploads folder and write files.";
      toast.error(msg);
    }
  }

  return (
    <div className="flex gap-6">
      <aside className="w-56 flex-shrink-0 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Folders</span>
          <button
            type="button"
            onClick={() => setShowAddFolder(true)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            title="Add directory"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
        <ul className="space-y-0.5">
          <li
            onDragOver={(e) => {
              e.preventDefault();
              if (e.dataTransfer.types.includes("application/x-media-id")) e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("application/x-media-id");
              if (id) handleMove(id, "");
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedFolder(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm ${selectedFolder === null ? "bg-indigo-600/20 text-indigo-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
            >
              <Folder className="w-4 h-4" />
              All
            </button>
          </li>
          {(folders ?? []).map((f) => (
            <li
              key={f.id}
              className="group/folder flex items-center gap-0.5"
              onDragOver={(e) => {
                e.preventDefault();
                if (e.dataTransfer.types.includes("application/x-media-id")) e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("application/x-media-id");
                if (id) handleMove(id, f.path);
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedFolder(f.path)}
                className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm truncate ${selectedFolder === f.path ? "bg-indigo-600/20 text-indigo-400" : "text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
                title={f.path}
              >
                <Folder className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{folderDisplayLabel(f)}</span>
              </button>
              {confirmFolderId === f.id ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteFolder(f.id)}
                    disabled={deletingFolder}
                    className="p-1.5 rounded text-red-400 hover:bg-red-500/20 text-xs"
                    title="Confirm delete"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmFolderId(null)}
                    className="p-1.5 rounded text-zinc-400 hover:bg-zinc-700 text-xs"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setConfirmFolderId(f.id); }}
                  className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/folder:opacity-100"
                  title="Delete folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {showAddFolder && (
          <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2">
            <select
              value={addFolderParentPath}
              onChange={(e) => setAddFolderParentPath(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No parent (root)</option>
              {(folders ?? []).map((f) => (
                <option key={f.id} value={f.path}>
                  {folderDisplayLabel(f)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={addFolderName}
              onChange={(e) => setAddFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === "Enter" && handleAddFolder()}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddFolder}
                disabled={creatingFolder || !addFolderName.trim()}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-500 disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowAddFolder(false); setAddFolderName(""); setAddFolderParentPath(""); }}
                className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-400 text-xs hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Image className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Media Library</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {selectedFolder
                ? `Folder: ${folders?.find((f) => f.path === selectedFolder)?.name ?? selectedFolder}`
                : "Upload and manage media files."}
            </p>
          </div>
        </div>

        <div
          className={`mb-8 p-8 rounded-xl border-2 border-dashed text-center transition-colors ${
            drag ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-700 bg-zinc-900/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            if (e.dataTransfer.types.includes("Files")) setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files?.length) handleFile(e.dataTransfer.files);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFile(e.target.files)}
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading…" : "Upload files"}
            </button>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Upload to:</span>
              <select
                value={uploadToFolder}
                onChange={(e) => setUploadToFolder(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Default (date folder)</option>
                {(folders ?? []).map((f) => (
                  <option key={f.id} value={f.path}>
                    {folderDisplayLabel(f)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-sm text-zinc-500">or drag and drop files here</p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-zinc-500">Loading…</div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <div className="px-6 py-3 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-400">
                Files {selectedFolder ? `in this folder` : ""}
              </h2>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 p-6">
              {files?.map((f) => (
                <li
                  key={f.id}
                  draggable
                  className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden group relative cursor-grab active:cursor-grabbing"
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-media-id", f.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                >
                  {f.mime.startsWith("image/") ? (
                    <img
                      src={f.url}
                      alt={f.name}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-zinc-800">
                      <FileText className="w-10 h-10 text-zinc-600" />
                    </div>
                  )}
                  <p className="p-2 text-xs text-zinc-500 truncate" title={f.name}>
                    {f.name}
                  </p>
                  {confirmId === f.id ? (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-2">
                      <span className="text-xs text-zinc-300 text-center">Delete this file?</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(f.id)}
                          disabled={deleting}
                          className="px-2 py-1 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-500 disabled:opacity-50"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-1 rounded bg-zinc-600 text-white text-xs font-medium hover:bg-zinc-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(f.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/90 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-opacity"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {(!files || files.length === 0) && (
              <div className="px-6 py-12 text-center text-zinc-500 text-sm">
                {selectedFolder ? "No files in this folder. Upload files and choose this folder as destination." : "No files yet. Upload your first file above."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
