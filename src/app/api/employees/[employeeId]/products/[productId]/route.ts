import { NextRequest } from "next/server";

/**
 * API Proxy for employee product management
 * Handles product assignment/removal for employees
 */

async function handleProductOperation(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string; productId: string }> },
  method: string
) {
  const { employeeId, productId } = await params;
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
    // Parse request body (even for DELETE, we need entityId)
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      console.log(`[Product ${method}] No body or invalid JSON, using empty object`);
    }

    const { entityId, allocated, enabled } = body;

    if (!entityId) {
      return new Response(
        JSON.stringify({ error: "entityId is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Call Flask API: /v1/employees/{entity_id}/{employee_id}/products/{product_id}
    const flaskUrl = `${apiUrl}/v1/employees/${entityId}/${employeeId}/products/${productId}`;
    
    console.log(`[Product ${method}] Calling Flask API:`, flaskUrl);
    console.log(`[Product ${method}] Entity ID:`, entityId);
    console.log(`[Product ${method}] Employee ID:`, employeeId);
    console.log(`[Product ${method}] Product ID:`, productId);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method === "PUT") {
      const requestBody: any = {};
      if (allocated !== undefined) requestBody.allocated = allocated;
      if (enabled !== undefined) requestBody.enabled = enabled;
      
      fetchOptions.body = JSON.stringify(requestBody);
      console.log(`[Product ${method}] Request body:`, requestBody);
    }

    const response = await fetch(flaskUrl, fetchOptions);

    console.log(`[Product ${method}] Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Product ${method}] Flask API error:`, response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to ${method.toLowerCase()} product: ${response.status}`,
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
    console.log(`[Product ${method}] Success:`, result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error(`[Product ${method}] Error:`, error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to ${method.toLowerCase()} product`,
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// PUT: Assign product to employee
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; productId: string }> }
) {
  return handleProductOperation(request, context, "PUT");
}

// DELETE: Remove product from employee
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ employeeId: string; productId: string }> }
) {
  return handleProductOperation(request, context, "DELETE");
}
