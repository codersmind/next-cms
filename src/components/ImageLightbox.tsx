"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;

type Props = {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
};

export function ImageLightbox({ src, alt = "", open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; ox: number; oy: number } | null>(
    null
  );
  const viewportRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetView();
  }, [open, src, resetView]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP));
      }
      if (e.key === "-") {
        e.preventDefault();
        setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP));
      }
      if (e.key === "0") resetView();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, resetView]);

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!open || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open]);

  useEffect(() => {
    if (scale <= 1) setOffset({ x: 0, y: 0 });
  }, [scale]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (scale <= 1) return;
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startY: e.clientY,
        ox: offset.x,
        oy: offset.y,
      };
    },
    [scale, offset.x, offset.y]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d?.active) return;
    setOffset({
      x: d.ox + (e.clientX - d.startX),
      y: d.oy + (e.clientY - d.startY),
    });
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragRef.current?.active) {
      dragRef.current.active = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* */
      }
    }
  }, []);

  if (!open || !mounted) return null;

  const zoomPercent = Math.round(scale * 100);
  const canPan = scale > 1;

  const ui = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* Full-screen backdrop — covers sidebar and all admin chrome */}
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Close preview"
        tabIndex={-1}
      />

      {/* Modal shell above backdrop */}
      <div className="relative z-10 flex flex-col h-[100dvh] max-h-[100dvh] w-full pointer-events-none">
        <header className="pointer-events-auto shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-zinc-950/95 border-b border-zinc-800 shadow-lg">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => zoomBy(-ZOOM_STEP)}
              disabled={scale <= MIN_SCALE}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="min-w-[3.5rem] text-center text-sm font-medium text-zinc-200 tabular-nums">
              {zoomPercent}%
            </span>
            <button
              type="button"
              onClick={() => zoomBy(ZOOM_STEP)}
              disabled={scale >= MAX_SCALE}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-40"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={resetView}
              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
              aria-label="Reset zoom"
              title="Reset (0)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          {alt ? (
            <p className="hidden sm:block flex-1 text-center text-sm text-zinc-400 truncate px-4">{alt}</p>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white ring-1 ring-zinc-700"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div
          ref={viewportRef}
          className={`pointer-events-auto flex-1 min-h-0 overflow-auto overscroll-contain ${
            canPan ? "cursor-grab active:cursor-grabbing" : "cursor-default"
          }`}
        >
          <div className="flex min-h-full min-w-full items-center justify-center p-4 sm:p-8">
            <div
              className="inline-block origin-center"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={(e) => {
                e.stopPropagation();
                resetView();
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="block max-w-[min(92vw,1400px)] max-h-[min(72dvh,900px)] w-auto h-auto object-contain rounded-md shadow-2xl ring-1 ring-white/10 select-none"
                draggable={false}
              />
            </div>
          </div>
        </div>

        <footer className="pointer-events-auto shrink-0 px-4 py-2.5 bg-zinc-950/95 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-500">
            Scroll to zoom · Drag to pan when zoomed · Double-click to reset · Esc to close
          </p>
          {alt ? <p className="sm:hidden mt-1 text-sm text-zinc-400 truncate">{alt}</p> : null}
        </footer>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
