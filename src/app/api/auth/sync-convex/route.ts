import { NextRequest } from "next/server";
import { syncUserToConvexWithOrg } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { userId, email, name, entityId } = await req.json();

    if (!userId || !email || !entityId) {
      return Response.json({ error: "userId, email and entityId required" }, { status: 400 });
    }

    await syncUserToConvexWithOrg({
      authId: userId,
      email,
      name: name ?? null,
      organizationId: entityId,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("/api/auth/sync-convex error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
