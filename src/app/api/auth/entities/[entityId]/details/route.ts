import { NextRequest, NextResponse } from "next/server";

const ENTITY_API_ORIGIN = process.env.ENTITY_API_ORIGIN ?? "http://127.0.0.1:8081";

/**
 * GET /api/auth/entities/{entityId}/details
 * Returns detailed entity information including all nested data
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ entityId: string }> }) {
  try {
    const { entityId } = await params;

    if (!entityId) {
      return NextResponse.json({ error: "entityId is required in path" }, { status: 400 });
    }

    const upstreamUrl = `${ENTITY_API_ORIGIN}/v1/entities/${encodeURIComponent(entityId)}/details`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    const contentType = upstreamRes.headers.get("content-type") || "";
    const text = await upstreamRes.text();

    if (!upstreamRes.ok) {
      if (contentType.includes("application/json")) {
        try {
          return NextResponse.json(JSON.parse(text), { status: upstreamRes.status });
        } catch (e) {
          return new NextResponse(text, { status: upstreamRes.status });
        }
      }
      return new NextResponse(text, { status: upstreamRes.status });
    }

    if (contentType.includes("application/json")) {
      return NextResponse.json(JSON.parse(text));
    }

    return new NextResponse(text);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to get entity details" }, { status: 500 });
  }
}
