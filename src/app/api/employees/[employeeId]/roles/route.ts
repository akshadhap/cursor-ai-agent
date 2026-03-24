import { NextRequest } from "next/server";

/**
 * API Proxy for employee role management
 * Updates employee roles
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return new Response(
      JSON.stringify({ error: "API URL not configured" }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const body = await request.json();
    const { entityId, roles } = body;

    if (!entityId) {
      return new Response(
        JSON.stringify({ error: "entityId is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (!roles || !Array.isArray(roles)) {
      return new Response(
        JSON.stringify({ error: "roles array is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Call Flask API: PUT /v1/entities/{entity_id}/employees/{employee_id}
    const flaskUrl = `${apiUrl}/v1/entities/${entityId}/employees/${employeeId}`;
    
    console.log(`[Role Update] Calling Flask API:`, flaskUrl);
    console.log(`[Role Update] Entity ID:`, entityId);
    console.log(`[Role Update] Employee ID:`, employeeId);
    console.log(`[Role Update] Roles:`, roles);

    const response = await fetch(flaskUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roles }),
    });

    console.log(`[Role Update] Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Role Update] Flask API error:`, response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to update roles: ${response.status}`,
          details: errorText,
          url: flaskUrl
        }),
        { 
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const result = await response.json();
    console.log(`[Role Update] Success:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error(`[Role Update] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to update roles",
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
