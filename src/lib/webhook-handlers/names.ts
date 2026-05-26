/** Client-safe list of built-in inbound handlers (register more in registry.ts). */
export const BUILTIN_WEBHOOK_HANDLERS = [
  "document.updateOnMatch",
  "payment.markPaid",
  "plugin.sendEmail",
] as const;
