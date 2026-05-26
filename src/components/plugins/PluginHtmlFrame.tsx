"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const RESIZE_MESSAGE = "next-cms-plugin-resize";

type Props = {
  src: string;
  title: string;
};

export function PluginHtmlFrame({ src, title }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);
  const [frameSrc, setFrameSrc] = useState(src);

  useEffect(() => {
    try {
      const url = new URL(src, window.location.origin);
      const token = localStorage.getItem("jwt");
      if (token) url.searchParams.set("access_token", token);
      setFrameSrc(`${url.pathname}${url.search}`);
    } catch {
      setFrameSrc(src);
    }
  }, [src]);

  const applyHeight = useCallback((next: number) => {
    const clamped = Math.max(200, Math.min(next + 16, 2400));
    setHeight(clamped);
  }, []);

  const measureIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const h = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0
      );
      if (h > 0) applyHeight(h);
    } catch {
      /* cross-origin — should not happen for same-origin plugin assets */
    }
  }, [applyHeight]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; height?: number };
      if (data?.type !== RESIZE_MESSAGE || typeof data.height !== "number") return;
      applyHeight(data.height);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [applyHeight]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.addEventListener("load", measureIframe);
    return () => iframe.removeEventListener("load", measureIframe);
  }, [frameSrc, measureIframe]);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
      <iframe
        ref={iframeRef}
        title={title}
        src={frameSrc}
        sandbox="allow-scripts allow-forms allow-same-origin"
        style={{ height: `${height}px`, display: "block", overflow: "hidden" }}
        className="w-full border-0 bg-zinc-950"
      />
    </div>
  );
}

export const PLUGIN_IFRAME_RESIZE_TYPE = RESIZE_MESSAGE;
