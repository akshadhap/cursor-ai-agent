import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    const body = await request.json();
    
    // Support both old format (productKey/tierKey) and new format (activePlans)
    let activePlans: Record<string, string>;
    
    if (body.activePlans) {
      // New format: complete activePlans object
      activePlans = body.activePlans;
    } else if (body.productKey && body.tierKey) {
      // Old format: single productKey/tierKey pair
      activePlans = {
        [body.productKey]: body.tierKey,
      };
    } else {
      return NextResponse.json(
        { error: "Missing activePlans or productKey/tierKey" },
        { status: 400 }
      );
    }

    const entityApiOrigin = process.env.ENTITY_API_ORIGIN;
    if (!entityApiOrigin) {
      console.error("ENTITY_API_ORIGIN not configured");
      return NextResponse.json(
        { error: "Entity API not configured" },
        { status: 500 }
      );
    }

    console.log("[Update Plan] Updating entity", entityId, "with plans:", activePlans);

    // Update entity's activePlans in Firestore via Entity API
    const updateResponse = await fetch(`${entityApiOrigin}/v1/entities/${entityId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        activePlans,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error("Failed to update entity plan:", errorText);
      return NextResponse.json(
        { error: "Failed to update entity plan" },
        { status: updateResponse.status }
      );
    }

    const updatedEntity = await updateResponse.json();
    console.log("[Update Plan] Successfully updated entity:", entityId);

    return NextResponse.json({
      success: true,
      entity: updatedEntity,
    });
  } catch (error) {
    console.error("Error updating entity plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
