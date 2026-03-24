import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../../convex/_generated/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Missing email parameter" },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return NextResponse.json(
        { error: "Convex not configured" },
        { status: 503 }
      );
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    const entities = await convex.query(api.public.entities.findEntitiesWithEmployeeEmail, {
      email,
    });

    if (!entities || entities.length === 0) {
      return NextResponse.json({ found: false });
    }

    // Return first entity found (user exists in at least one organization)
    const firstEntity = entities[0];
    const firstEmployee = firstEntity.employees?.[0];

    return NextResponse.json({
      found: true,
      entityId: firstEntity.entityId,
      employee: {
        employeeId: firstEmployee?.employeeId,
        email: firstEmployee?.email,
        name: firstEmployee?.displayName || firstEmployee?.name,
        status: firstEmployee?.status,
      },
      totalEntities: entities.length,
    });
  } catch (error) {
    console.error("[Check Email] Error:", error);
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    );
  }
}
