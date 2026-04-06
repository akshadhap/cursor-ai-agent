import { NextRequest, NextResponse } from "next/server";

const ENTITY_API_ORIGIN = process.env.ENTITY_API_ORIGIN ?? "http://127.0.0.1:8081";

export async function GET(req: NextRequest, { params }: { params: Promise<{ entityId: string }> }) {
  try {
    const { entityId } = await params;

    if (!entityId) {
      return NextResponse.json({ error: "entityId is required in path" }, { status: 400 });
    }

    const upstream = `${ENTITY_API_ORIGIN}/v1/entities/${encodeURIComponent(entityId)}/employees`;
    const res = await fetch(upstream, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: res.status });
    } catch {
      return new NextResponse(text, { status: res.status });
    }
  } catch (err) {
    console.error("/api/auth/entities/[entityId]/employees GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    // entityId is in the pathname, but Next provides it via the route param in file system. However in this simple proxy we'll parse from url
    const pathParts = req.url.split("/v1/");
    // Instead, extract from the pathname
    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const idx = segments.findIndex((s) => s === "entities");
    const entityId = idx >= 0 && segments.length > idx + 1 ? segments[idx + 1] : null;

    if (!entityId) return Response.json({ error: "entityId is required in path" }, { status: 400 });

    const body = await req.json();

    const upstream = `${ENTITY_API_ORIGIN}/v1/entities/${encodeURIComponent(entityId)}/employees`;
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      return new Response(JSON.stringify(json), { status: res.status, headers: { "Content-Type": "application/json" } });
    } catch {
      return new Response(text, { status: res.status });
    }
  } catch (err) {
    console.error("/api/auth/entities/[entityId]/employees error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
