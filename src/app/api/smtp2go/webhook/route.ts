// src/app/api/smtp2go/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

/**
 * Basic SMTP2GO webhook handler.
 *
 * You need to configure the webhook URL in your SMTP2GO dashboard to point to:
 *   POST /api/smtp2go/webhook
 *
 * The exact payload shape may vary – this is a pragmatic handler that expects
 * an array of events. Adjust mapping once you see real payloads in your logs.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Log for debugging (feel free to remove / gate behind env)
  console.log("SMTP2GO webhook payload:", JSON.stringify(body, null, 2));

  const events: any[] = Array.isArray(body) ? body : body.events || [];

  for (const evt of events) {
    const email: string | undefined = evt.email;
    const eventType: string | undefined = evt.event || evt.type;

    if (!email || !eventType) continue;

    let emailStatus: "DELIVERED" | "OPENED" | "BOUNCED" | null = null;

    const normalized = eventType.toLowerCase();
    if (normalized.includes("delivered")) {
      emailStatus = "DELIVERED";
    } else if (normalized.includes("open")) {
      emailStatus = "OPENED";
    } else if (normalized.includes("bounce") || normalized.includes("failed")) {
      emailStatus = "BOUNCED";
    }

    if (!emailStatus) continue;

    await prisma.lead.updateMany({
      where: { email },
      data: {
        emailStatus,
        lastActivityAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
