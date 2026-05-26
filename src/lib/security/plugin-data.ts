const SENSITIVE_FIELD_RE = /^(pass|password|secret|api[_-]?key|token|authorization)$/i;

function redactObject(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_FIELD_RE.test(k)) {
      out[k] = "[REDACTED]";
    } else if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redactObject(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Mask secrets in plugin storage API responses. */
export function redactPluginStoredValue(
  collection: string,
  key: string,
  value: unknown
): unknown {
  if (collection === "settings" || SENSITIVE_FIELD_RE.test(key)) {
    return redactObject(value);
  }
  return value;
}
