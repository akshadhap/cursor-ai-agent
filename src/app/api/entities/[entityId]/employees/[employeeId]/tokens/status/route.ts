import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; employeeId: string }> }
) {
  try {
    const { entityId, employeeId } = await params;
    
    const ENTITY_API_ORIGIN = process.env.ENTITY_API_ORIGIN;
    if (!ENTITY_API_ORIGIN) {
      return NextResponse.json(
        { error: "ENTITY_API_ORIGIN not configured" },
        { status: 500 }
      );
    }

    const url = `${ENTITY_API_ORIGIN}/v1/employees/${entityId}/${employeeId}/tokens`;
    console.log("[Token Status] Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("[Token Status] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Token Status] Error response:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch token status", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[Token Status] Success:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Token Status] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token status", details: (error as Error).message },
      { status: 500 }
    );
  }
}
