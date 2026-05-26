/** Outbound: fired when CMS content changes. Inbound: fired when an external service POSTs to your receive URL. */
export const WEBHOOK_EVENTS = [
  { value: "entry.create", label: "Entry created", directions: ["outbound"] as const },
  { value: "entry.update", label: "Entry updated", directions: ["outbound"] as const },
  { value: "entry.delete", label: "Entry deleted", directions: ["outbound"] as const },
  { value: "entry.publish", label: "Entry published", directions: ["outbound"] as const },
  { value: "entry.unpublish", label: "Entry unpublished", directions: ["outbound"] as const },
  { value: "inbound.received", label: "Inbound payload received", directions: ["outbound"] as const },
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]["value"];

export function eventsForDirection(direction: "outbound" | "inbound"): string[] {
  if (direction === "inbound") {
    return [];
  }
  return WEBHOOK_EVENTS.filter((e) => e.directions.includes("outbound")).map((e) => e.value);
}

export function isValidWebhookEvent(event: string): boolean {
  return WEBHOOK_EVENTS.some((e) => e.value === event);
}
