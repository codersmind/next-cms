import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";
import { eventsForDirection, isValidWebhookEvent } from "@/lib/webhook-events";
import { generateWebhookSecret } from "@/lib/webhook-service";

function serializeWebhook(w: {
  id: string;
  name: string;
  direction: string;
  url: string | null;
  secret: string | null;
  enabled: boolean;
  events: string;
  contentTypes: string | null;
  headers: string | null;
  actions: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { deliveries: number };
}) {
  return {
    id: w.id,
    name: w.name,
    direction: w.direction,
    url: w.url,
    hasSecret: !!w.secret,
    enabled: w.enabled,
    events: JSON.parse(w.events || "[]") as string[],
    contentTypes: w.contentTypes ? (JSON.parse(w.contentTypes) as string[]) : [],
    headers: w.headers ? (JSON.parse(w.headers) as Record<string, string>) : {},
    actions: w.actions ? JSON.parse(w.actions) : null,
    deliveriesCount: w._count?.deliveries,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.webhooks");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const webhooks = await prisma.webhook.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { deliveries: true } } },
  });
  return NextResponse.json(webhooks.map(serializeWebhook));
}

export async function POST(req: NextRequest) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.webhooks");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    name?: string;
    direction?: "outbound" | "inbound";
    url?: string;
    secret?: string;
    generateSecret?: boolean;
    enabled?: boolean;
    events?: string[];
    contentTypes?: string[];
    headers?: Record<string, string>;
    actions?: Record<string, unknown> | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const direction = body.direction === "inbound" ? "inbound" : "outbound";
  if (direction === "outbound" && !body.url?.trim()) {
    return NextResponse.json({ error: "url required for outbound webhooks" }, { status: 400 });
  }

  const events = (body.events ?? eventsForDirection(direction)).filter(isValidWebhookEvent);
  if (direction === "outbound" && events.length === 0) {
    return NextResponse.json({ error: "At least one event required" }, { status: 400 });
  }

  let secret = body.secret?.trim() || null;
  if (body.generateSecret || (direction === "inbound" && !secret)) {
    secret = generateWebhookSecret();
  }

  const created = await prisma.webhook.create({
    data: {
      name,
      direction,
      url: direction === "outbound" ? body.url!.trim() : null,
      secret,
      enabled: body.enabled !== false,
      events: JSON.stringify(events),
      contentTypes:
        body.contentTypes && body.contentTypes.length > 0
          ? JSON.stringify(body.contentTypes.map((s) => s.toLowerCase()))
          : null,
      headers:
        body.headers && Object.keys(body.headers).length > 0
          ? JSON.stringify(body.headers)
          : null,
      actions:
        direction === "inbound" && body.actions
          ? JSON.stringify(body.actions)
          : null,
    },
    include: { _count: { select: { deliveries: true } } },
  });

  const serialized = serializeWebhook(created);
  if (direction === "inbound" && secret) {
    return NextResponse.json({ ...serialized, secret });
  }
  return NextResponse.json(serialized);
}
