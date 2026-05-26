import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserWithRoleFromRequest, canAccess } from "@/lib/auth";
import { isValidWebhookEvent } from "@/lib/webhook-events";
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
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.webhooks");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const webhook = await prisma.webhook.findUnique({ where: { id } });
  if (!webhook) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeWebhook(webhook));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.webhooks");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.webhook.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    name?: string;
    url?: string;
    secret?: string | null;
    regenerateSecret?: boolean;
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

  const direction = existing.direction;
  const data: {
    name?: string;
    url?: string | null;
    secret?: string | null;
    enabled?: boolean;
    events?: string;
    contentTypes?: string | null;
    headers?: string | null;
    actions?: string | null;
  } = {};

  if (body.name != null) data.name = body.name.trim();
  if (body.url != null && direction === "outbound") data.url = body.url.trim();
  if (body.enabled != null) data.enabled = body.enabled;
  if (body.events != null) {
    const events = body.events.filter(isValidWebhookEvent);
    if (direction === "outbound" && events.length === 0) {
      return NextResponse.json({ error: "At least one event required" }, { status: 400 });
    }
    data.events = JSON.stringify(events);
  }
  if (body.contentTypes != null) {
    data.contentTypes =
      body.contentTypes.length > 0
        ? JSON.stringify(body.contentTypes.map((s) => s.toLowerCase()))
        : null;
  }
  if (body.headers != null) {
    data.headers =
      Object.keys(body.headers).length > 0 ? JSON.stringify(body.headers) : null;
  }
  if (body.actions !== undefined && direction === "inbound") {
    data.actions = body.actions ? JSON.stringify(body.actions) : null;
  }
  if (body.regenerateSecret) {
    data.secret = generateWebhookSecret();
  } else if (body.secret !== undefined) {
    data.secret = body.secret?.trim() || null;
  }

  const updated = await prisma.webhook.update({ where: { id }, data });
  const serialized = serializeWebhook(updated);
  if (body.regenerateSecret && updated.secret) {
    return NextResponse.json({ ...serialized, secret: updated.secret });
  }
  return NextResponse.json(serialized);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserWithRoleFromRequest(req.headers.get("authorization"));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await canAccess(user, "admin.webhooks");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.webhook.delete({ where: { id } }).catch(() => null);
  return new NextResponse(null, { status: 204 });
}
