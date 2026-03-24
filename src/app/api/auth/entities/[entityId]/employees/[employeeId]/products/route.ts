import { NextRequest, NextResponse } from "next/server";

const ENTITY_API_ORIGIN = process.env.ENTITY_API_ORIGIN || "http://127.0.0.1:8081";

/**
 * GET /api/auth/entities/{entityId}/employees/{employeeId}/products
 * Returns all product access and allocations for a specific employee
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ entityId: string; employeeId: string }> }) {
  try {
    const { entityId, employeeId } = await params;

    const upstreamUrl = `${ENTITY_API_ORIGIN}/v1/entities/${encodeURIComponent(entityId)}/employees/${encodeURIComponent(employeeId)}/products`;

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
    return NextResponse.json({ error: err?.message || "Failed to get employee products" }, { status: 500 });
  }
}

/**
 * POST /api/auth/entities/{entityId}/employees/{employeeId}/products
 * Updates product allocations for an employee
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ entityId: string; employeeId: string }> }) {
  try {
    const { entityId, employeeId } = await params;
    const body = await req.json().catch(() => ({}));

    const upstreamUrl = `${ENTITY_API_ORIGIN}/v1/entities/${encodeURIComponent(entityId)}/employees/${encodeURIComponent(employeeId)}/products`;

    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
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
    return NextResponse.json({ error: err?.message || "Failed to update employee products" }, { status: 500 });
  }
}
