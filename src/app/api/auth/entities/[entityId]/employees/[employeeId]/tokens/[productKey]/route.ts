import { NextRequest, NextResponse } from "next/server";

const ENTITY_API_ORIGIN = process.env.ENTITY_API_ORIGIN || "http://127.0.0.1:8080";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string; employeeId: string; productKey: string }> }
) {
  try {
    const { entityId, employeeId, productKey } = await params;

    console.log('[Token API] GET request:', { entityId, employeeId, productKey });

    // Convert productKey format (e.g., chatbot-builder -> chatbot_builder for Entity API)
    const normalizedProductKey = productKey.replace(/-/g, '_');

    const upstreamUrl = `${ENTITY_API_ORIGIN}/v1/employees/${encodeURIComponent(entityId)}/${encodeURIComponent(employeeId)}/tokens/${encodeURIComponent(normalizedProductKey)}`;

    console.log('[Token API] Upstream URL:', upstreamUrl);

    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    console.log('[Token API] Upstream response status:', upstreamRes.status);

    const contentType = upstreamRes.headers.get("content-type") || "";
    const text = await upstreamRes.text();

    console.log('[Token API] Response text:', text);

    if (!upstreamRes.ok) {
      console.error('[Token API] Error response:', { status: upstreamRes.status, text });
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
    console.error('[Token API] Error:', err);
    return NextResponse.json(
      { error: err?.message || "Failed to get token allocation" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string; employeeId: string; productKey: string }> }
) {
  try {
    const { entityId, employeeId, productKey } = await params;
    const body = await req.json().catch(() => ({}));

    console.log('[Token API] PUT request:', { entityId, employeeId, productKey, body });

    // Convert productKey format (e.g., chatbot-builder -> chatbot_builder for Entity API)
    const normalizedProductKey = productKey.replace(/-/g, '_');

    const upstreamUrl = `${ENTITY_API_ORIGIN}/v1/employees/${encodeURIComponent(entityId)}/${encodeURIComponent(employeeId)}/tokens/${encodeURIComponent(normalizedProductKey)}`;

    console.log('[Token API] Upstream URL:', upstreamUrl);

    const upstreamRes = await fetch(upstreamUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log('[Token API] Upstream response status:', upstreamRes.status);

    const contentType = upstreamRes.headers.get("content-type") || "";
    const text = await upstreamRes.text();

    console.log('[Token API] Response text:', text);

    if (!upstreamRes.ok) {
      console.error('[Token API] Error response:', { status: upstreamRes.status, text });
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
    console.error('[Token API] Error:', err);
    return NextResponse.json(
      { error: err?.message || "Failed to update token allocation" },
      { status: 500 }
    );
  }
}
