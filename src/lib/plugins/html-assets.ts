/**
 * When plugin HTML is loaded with ?access_token=, subresources (script, link)
 * do not inherit the query string. Rewrite asset URLs so JS/CSS can authenticate.
 */
export function rewritePluginHtmlWithAccessToken(
  html: string,
  pluginId: string,
  htmlRelPath: string,
  accessToken: string
): string {
  const htmlDir = htmlRelPath.includes("/")
    ? htmlRelPath.replace(/\/[^/]+$/, "")
    : "";
  const tokenParam = `access_token=${encodeURIComponent(accessToken)}`;

  return html.replace(
    /(\s(?:src|href)=["'])((?!https?:|\/\/|data:|mailto:|#)[^"']+)(["'])/gi,
    (_match, open: string, url: string, close: string) => {
      const resolved = resolvePluginAssetUrl(url, pluginId, htmlDir);
      if (!resolved) return `${open}${url}${close}`;
      const withToken = appendAccessToken(resolved, tokenParam);
      return `${open}${withToken}${close}`;
    }
  );
}

function resolvePluginAssetUrl(
  url: string,
  pluginId: string,
  htmlDir: string
): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const pluginPrefix = `/api/plugins/${pluginId}/assets/`;

  if (trimmed.startsWith(pluginPrefix)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return null;
  }

  const baseSegments = htmlDir ? htmlDir.split("/").filter(Boolean) : [];
  let rel = trimmed;
  if (rel.startsWith("./")) rel = rel.slice(2);
  while (rel.startsWith("../")) {
    rel = rel.slice(3);
    baseSegments.pop();
  }
  const joined = [...baseSegments, ...rel.split("/").filter(Boolean)].join("/");
  if (!joined.startsWith("admin/")) return null;
  return `${pluginPrefix}${joined}`;
}

function appendAccessToken(url: string, tokenParam: string): string {
  const hashIdx = url.indexOf("#");
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const hash = hashIdx >= 0 ? url.slice(hashIdx) : "";
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${tokenParam}${hash}`;
}
