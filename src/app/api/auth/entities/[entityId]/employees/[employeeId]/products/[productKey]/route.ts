import { NextRequest, NextResponse } from "next/server";

const ENTITY_API_ORIGIN = process.env.ENTITY_API_ORIGIN || "http://127.0.0.1:8081";

/**
 * PUT /api/auth/entities/{entityId}/employees/{employeeId}/products/{productKey}
 * Updates product access for a specific employee and product
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string; employeeId: string; productKey: string }> }
) {
  try {
    const { entityId, employeeId, productKey } = await params;
    const body = await req.json().catch(() => ({}));

    // Convert productKey format (e.g., chatbot-builder -> chatbot_builder for Entity API)
    const normalizedProductKey = productKey.replace(/-/g, '_');

    const upstreamUrl = `${ENTITY_API_ORIGIN}/v1/entities/${encodeURIComponent(entityId)}/employees/${encodeURIComponent(employeeId)}/products/${encodeURIComponent(normalizedProductKey)}`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
    return NextResponse.json(
      { error: err?.message || "Failed to update product access" },
      { status: 500 }
    );
  }
}
