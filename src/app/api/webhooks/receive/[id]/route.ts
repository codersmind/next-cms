import { NextRequest, NextResponse } from "next/server";
import { receiveInboundWebhook } from "@/lib/webhook-service";

const MAX_BODY_BYTES = 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const result = await receiveInboundWebhook(id, raw, headers);
  if (!result.ok) {
    return NextResponse.json(
      result.body ?? { error: result.error ?? "Failed" },
      { status: result.status }
    );
  }
  return NextResponse.json(result.body ?? { received: true });
}
