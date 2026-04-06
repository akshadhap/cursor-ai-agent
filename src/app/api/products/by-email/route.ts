import { NextRequest } from "next/server";

/**
 * API Proxy for email-based product assignment
 * POST /api/products/by-email
 * Proxies to Flask: POST /v1/products/by-email
 */
export async function POST(request: NextRequest) {
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
    const { email, productId, allocated, enabled } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (!productId) {
      return new Response(
        JSON.stringify({ error: "productId is required" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Call Flask API: POST /v1/products/by-email
    const flaskUrl = `${apiUrl}/v1/products/by-email`;
    
    console.log('[Products By Email] Calling Flask API:', flaskUrl);
    console.log('[Products By Email] Email:', email);
    console.log('[Products By Email] Product ID:', productId);
    console.log('[Products By Email] Allocated:', allocated);
    console.log('[Products By Email] Enabled:', enabled);

    // Build request body based on what's provided
    const requestBody: any = { email, productId };
    if (allocated !== undefined) requestBody.allocated = allocated;
    if (enabled !== undefined) requestBody.enabled = enabled;

    const response = await fetch(flaskUrl, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[Products By Email] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Products By Email] Flask API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to assign product: ${response.status}`,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const result = await response.json();
    console.log('[Products By Email] Success:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error('[Products By Email] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to assign product',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
