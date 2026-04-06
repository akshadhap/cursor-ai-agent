import { NextRequest, NextResponse } from "next/server";

/**
 * API Proxy for employee operations
 * Proxies requests to Entity API for employee management
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; employeeId: string }> }
) {
  const { entityId, employeeId } = await params;
  const entityApiOrigin = process.env.ENTITY_API_ORIGIN;

  if (!entityApiOrigin) {
    console.error("[Employee Get] ENTITY_API_ORIGIN not configured");
    return NextResponse.json(
      { error: "Entity API not configured" },
      { status: 500 }
    );
  }

  try {
    // Call Entity API: GET /v1/entities/{entity_id}/employees/{employee_id}
    const entityApiUrl = `${entityApiOrigin}/v1/entities/${entityId}/employees/${employeeId}`;
    
    console.log('[Employee Get] Calling Entity API:', entityApiUrl);

    const response = await fetch(entityApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[Employee Get] Employee not found or error:', errorText);
      return NextResponse.json(
        { error: "Employee not found", details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[Employee Get] ✓ Employee found');

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Employee Get] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
