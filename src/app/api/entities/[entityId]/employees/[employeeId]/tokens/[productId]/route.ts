import { NextRequest, NextResponse } from "next/server";

/**
 * API Proxy for employee token management
 * Handles token allocation updates for employees
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; employeeId: string; productId: string }> }
) {
  const { entityId, employeeId, productId } = await params;
  const entityApiOrigin = process.env.ENTITY_API_ORIGIN;

  if (!entityApiOrigin) {
    console.error("[Token Update] ENTITY_API_ORIGIN not configured");
    return NextResponse.json(
      { error: "Entity API not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    
    // Call Entity API: PUT /v1/employees/{entity_id}/{employee_id}/tokens/{product_id}
    const entityApiUrl = `${entityApiOrigin}/v1/employees/${entityId}/${employeeId}/tokens/${productId}`;
    
    console.log('[Token Update] ====== Token Update Request ======');
    console.log('[Token Update] Entity API URL:', entityApiUrl);
    console.log('[Token Update] Entity ID:', entityId);
    console.log('[Token Update] Employee ID:', employeeId);
    console.log('[Token Update] Product ID:', productId);
    console.log('[Token Update] Request Body:', body);

    const response = await fetch(entityApiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[Token Update] Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Token Update] ✗ Entity API error:', errorText);
      console.error('[Token Update] Status:', response.status);
      return NextResponse.json(
        { error: "Failed to update tokens", details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[Token Update] ✓ Success:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Token Update] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; employeeId: string; productId: string }> }
) {
  const { entityId, employeeId, productId } = await params;
  const entityApiOrigin = process.env.ENTITY_API_ORIGIN;

  if (!entityApiOrigin) {
    console.error("[Token Get] ENTITY_API_ORIGIN not configured");
    return NextResponse.json(
      { error: "Entity API not configured" },
      { status: 500 }
    );
  }

  try {
    // Call Entity API: GET /v1/employees/{entity_id}/{employee_id}/tokens/{product_id}
    const entityApiUrl = `${entityApiOrigin}/v1/employees/${entityId}/${employeeId}/tokens/${productId}`;
    
    console.log('[Token Get] Calling Entity API:', entityApiUrl);

    const response = await fetch(entityApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Token Get] Entity API error:', errorText);
      return NextResponse.json(
        { error: "Failed to get tokens" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Token Get] Error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
