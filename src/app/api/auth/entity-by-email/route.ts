import { NextRequest } from "next/server";

// Configure the upstream entity API via env or fallback to localhost
const ENTITY_API_ORIGIN = process.env.ENTITY_API_ORIGIN ?? "http://127.0.0.1:8081";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return Response.json({ error: "email is required" }, { status: 400 });
    }

    const upstreamUrl = `${ENTITY_API_ORIGIN}/v1/entities/by-employee-email?email=${encodeURIComponent(
      email
    )}`;

    const res = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    });

    const data = await res.text();

    // Forward status and body; parse JSON when possible
    try {
      const json = JSON.parse(data);
      return new Response(JSON.stringify(json), { status: res.status, headers: { "Content-Type": "application/json" } });
    } catch {
      return new Response(data, { status: res.status });
    }
  } catch (err) {
    console.error("/api/auth/entity-by-email error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
