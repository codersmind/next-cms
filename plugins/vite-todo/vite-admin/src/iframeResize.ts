const RESIZE_MESSAGE = "next-cms-plugin-resize";

export function reportPluginIframeHeight(): void {
  if (window.parent === window) return;
  const height = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );
  window.parent.postMessage(
    { type: RESIZE_MESSAGE, height },
    window.location.origin
  );
}
