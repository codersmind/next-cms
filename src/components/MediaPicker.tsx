"use client";

import { useState, useCallback, useRef } from "react";
import { useFormikContext } from "formik";
import toast from "react-hot-toast";
import {
  useGetMediaListQuery,
  useGetMediaByIdQuery,
  useUploadMediaMutation,
  useGetUploadStorageInfoQuery,
  type MediaFile,
} from "@/store/api/cmsApi";
import { Image, FileText, X, Search, Upload, AlertTriangle, ZoomIn } from "lucide-react";
import { ImageLightbox } from "@/components/ImageLightbox";

const PAGE_SIZE = 24;

function getIn(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => (acc != null && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

function extractUploadError(err: unknown): string {
  if (err && typeof err === "object" && "data" in err && err.data && typeof (err.data as { error?: string }).error === "string") {
    return (err.data as { error: string }).error;
  }
  return "Upload failed.";
}

export function MediaPicker({ name, label = "Image" }: { name: string; label?: string }) {
  const formik = useFormikContext<Record<string, unknown>>();
  const value = (getIn(formik.values, name) as string | null | undefined) ?? null;
  const onChange = useCallback(
    (id: string | null) => {
      formik.setFieldValue(name, id ?? "");
    },
    [formik, name]
  );

  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "images">("images");
  const [uploadDrag, setUploadDrag] = useState(false);
  const [uploadStorage, setUploadStorage] = useState<"local" | "s3" | "">("");
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openLightbox = useCallback((src: string, alt: string) => {
    setLightbox({ src, alt });
  }, []);

  const id = value && value.trim() ? value.trim() : null;
  const {
    data: selectedMedia,
    isError: mediaLoadError,
    isFetching: mediaLoading,
  } = useGetMediaByIdQuery(id ?? "", { skip: !id });

  const mediaMissing = Boolean(id && !mediaLoading && (mediaLoadError || !selectedMedia));

  const { data: listResponse, isLoading, refetch: refetchList } = useGetMediaListQuery(
    { page, pageSize: PAGE_SIZE, search: search.trim() || undefined, filter },
    { skip: !open }
  );
  const { data: storageInfo } = useGetUploadStorageInfoQuery(undefined, { skip: !open });
  const [uploadMedia, { isLoading: uploading }] = useUploadMediaMutation();

  const list = listResponse?.data ?? [];
  const meta = listResponse?.meta?.pagination;
  const pageCount = meta?.pageCount ?? 1;
  const total = meta?.total ?? 0;

  const storageOptions = storageInfo?.available ?? ["local"];
  const effectiveStorage =
    uploadStorage && storageOptions.includes(uploadStorage)
      ? uploadStorage
      : storageInfo?.default ?? "local";

  const handleSelect = useCallback(
    (media: MediaFile) => {
      onChange(media.id);
      setOpen(false);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const handleUpload = useCallback(
    async (filesList: FileList | null) => {
      if (!filesList?.length) return;
      const formData = new FormData();
      for (let i = 0; i < filesList.length; i++) {
        formData.append("files", filesList[i]);
      }
      if (storageOptions.length > 1) {
        formData.set("storage", effectiveStorage);
      }
      try {
        const uploaded = await uploadMedia(formData).unwrap();
        await refetchList();
        const image =
          uploaded.find((f) => f.mime.startsWith("image/")) ?? uploaded[0];
        if (image) {
          onChange(image.id);
          toast.success("Uploaded and selected.");
          setOpen(false);
        } else {
          toast.success("File uploaded. Select it from the list.");
        }
      } catch (err) {
        toast.error(extractUploadError(err));
      }
    },
    [uploadMedia, refetchList, onChange, storageOptions.length, effectiveStorage]
  );

  const openPicker = useCallback(() => setOpen(true), []);

  return (
    <div>
      <label className="block mb-1 text-sm text-zinc-400">{label}</label>
      <div className="flex items-center gap-3">
        {mediaMissing ? (
          <>
            <button
              type="button"
              onClick={openPicker}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center flex-shrink-0 hover:border-amber-400 transition-colors"
              title="Image missing — click to upload or replace"
            >
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-amber-200">Image not found</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                The linked file was deleted or is unavailable. Upload a new image or pick another.
              </p>
              <p className="text-xs text-zinc-600 mt-1 font-mono truncate" title={id ?? ""}>
                ID: {id}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openPicker}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload
              </button>
              <button
                type="button"
                onClick={openPicker}
                className="px-3 py-1.5 text-sm rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              >
                Browse
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-sm rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Clear
              </button>
            </div>
          </>
        ) : id && selectedMedia ? (
          <>
            <button
              type="button"
              onClick={() => {
                if (selectedMedia.mime.startsWith("image/")) {
                  openLightbox(selectedMedia.url, selectedMedia.name);
                }
              }}
              disabled={!selectedMedia.mime.startsWith("image/")}
              className="w-20 h-20 rounded-lg border border-zinc-700 bg-zinc-800 overflow-hidden flex-shrink-0 group relative focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-default"
              title={selectedMedia.mime.startsWith("image/") ? "View full size" : undefined}
            >
              {selectedMedia.mime.startsWith("image/") ? (
                <>
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.name}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn className="w-6 h-6 text-white" />
                  </span>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-zinc-500" />
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate" title={selectedMedia.name}>
                {selectedMedia.name}
              </p>
              <p className="text-xs text-zinc-500">{selectedMedia.mime}</p>
              {selectedMedia.mime.startsWith("image/") && (
                <button
                  type="button"
                  onClick={() => openLightbox(selectedMedia.url, selectedMedia.name)}
                  className="mt-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  View full size
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openPicker}
                className="px-3 py-1.5 text-sm rounded-lg border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-sm rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <Image className="w-5 h-5" />
            Select image
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">
                {mediaMissing ? "Replace or upload image" : "Select image"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {mediaMissing && (
              <div className="mx-4 mt-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  The current image reference is broken. Upload a new file or choose one from the library.
                </span>
              </div>
            )}

            <div className="p-4 border-b border-zinc-800 space-y-3">
              <div
                className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                  uploadDrag
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-zinc-600 bg-zinc-800/40 hover:border-zinc-500"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setUploadDrag(true);
                }}
                onDragLeave={() => setUploadDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setUploadDrag(false);
                  void handleUpload(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleUpload(e.target.files);
                    e.target.value = "";
                  }}
                />
                <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm text-zinc-300 mb-2">Upload from your computer</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {uploading ? "Uploading…" : "Choose files"}
                  </button>
                  {storageOptions.length > 1 && (
                    <select
                      value={uploadStorage || storageInfo?.default || "local"}
                      onChange={(e) => setUploadStorage(e.target.value as "local" | "s3")}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                    >
                      {storageOptions.includes("local") && (
                        <option value="local">Local disk</option>
                      )}
                      {storageOptions.includes("s3") && <option value="s3">S3</option>}
                    </select>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-2">or drag and drop here</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search library…"
                    className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value as "all" | "images");
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="images">Images only</option>
                  <option value="all">All files</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="py-12 text-center text-zinc-500">Loading…</div>
              ) : list.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  <p>No media match your filters.</p>
                  <p className="text-sm mt-1">Use the upload area above to add an image.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                  {list.map((media) => (
                    <div
                      key={media.id}
                      className={`group relative rounded-lg border-2 bg-zinc-800 overflow-hidden text-left ${
                        id === media.id ? "border-indigo-500 ring-1 ring-indigo-500" : "border-zinc-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelect(media)}
                        className="w-full hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset rounded-lg"
                      >
                        <div className="aspect-square bg-zinc-800">
                          {media.mime.startsWith("image/") ? (
                            <img
                              src={media.url}
                              alt={media.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-8 h-8 text-zinc-500" />
                            </div>
                          )}
                        </div>
                        <p className="p-1.5 text-xs text-zinc-400 truncate" title={media.name}>
                          {media.name}
                        </p>
                      </button>
                      {media.mime.startsWith("image/") && (
                        <button
                          type="button"
                          title="View full size"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLightbox(media.url, media.name);
                          }}
                          className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-white opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {pageCount > 1 && (
              <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
                <p className="text-sm text-zinc-500">
                  {total} item{total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 text-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-zinc-400">
                    Page {page} of {pageCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page >= pageCount}
                    className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ImageLightbox
        src={lightbox?.src ?? ""}
        alt={lightbox?.alt}
        open={!!lightbox}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
