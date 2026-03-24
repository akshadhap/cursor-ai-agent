import { NextRequest } from "next/server";

/**
 * API Proxy for updating employee tokens
 * Bypasses CORS by proxying requests through Next.js server
 */

async function handleTokenUpdate(
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
    const { entityId, productId, allocated } = body;

    if (!entityId || !productId || typeof allocated !== "number") {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: entityId, productId, allocated" 
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Call Flask API using the existing endpoint structure
    // The API expects: POST /v1/entities/{entity_id}/employees/{employee_id}/products
    const flaskUrl = `${apiUrl}/v1/entities/${entityId}/employees/${employeeId}/products`;
    
    console.log("[Token Update] Calling Flask API:", flaskUrl);
    console.log("[Token Update] Entity ID:", entityId);
    console.log("[Token Update] Employee ID:", employeeId);
    console.log("[Token Update] Product ID:", productId);
    console.log("[Token Update] Payload:", { [productId]: { allocated } });

    const response = await fetch(flaskUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        [productId]: {
          allocated
        }
      }),
    });

    console.log("[Token Update] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Token Update] Flask API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to update tokens: ${response.status}`,
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
    console.log("[Token Update] Success:", result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[Token Update] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to update tokens",
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// Export both POST and PUT handlers
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  return handleTokenUpdate(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string }> }
) {
  return handleTokenUpdate(request, context);
}
