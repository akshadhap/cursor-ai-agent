import { NextRequest } from "next/server";
import { ensureCustomerByExternalId } from "@/lib/polar";

export async function POST(req: NextRequest) {
  try {
    const { entityId, employeeId, email, name } = await req.json();

    if (!entityId || !email) {
      return Response.json(
        { error: "entityId and email are required" },
        { status: 400 }
      );
    }

    // Create Polar customer with entityId as external ID
    await ensureCustomerByExternalId(entityId, {
      email,
      name: name || email,
    });

    console.log("✅ Created Polar customer for entity:", entityId);

    return Response.json(
      {
        success: true,
        entityId,
        employeeId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Failed to create Polar customer:", error);
    return Response.json(
      { error: "Failed to create Polar customer", details: error.message },
      { status: 500 }
    );
  }
}
