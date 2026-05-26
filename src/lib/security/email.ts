const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function isValidEmailAddress(to: string): boolean {
  const t = to.trim();
  if (!t || t.length > 254) return false;
  if (t.includes("\n") || t.includes("\r")) return false;
  return EMAIL_RE.test(t);
}
