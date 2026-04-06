import { NextRequest } from "next/server";

/**
 * API Proxy for listing employee products by email
 * GET /api/products/list-by-email?email=user@example.com
 * Proxies to Flask: GET /v1/products/list-by-email?email=user@example.com
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");
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

  if (!email) {
    return new Response(
      JSON.stringify({ error: "email query parameter is required" }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    // Call Flask API: GET /v1/products/list-by-email?email=...
    const flaskUrl = `${apiUrl}/v1/products/list-by-email?email=${encodeURIComponent(email)}`;
    
    console.log('[Products List By Email] Calling Flask API:', flaskUrl);

    const response = await fetch(flaskUrl, {
      method: 'GET',
      headers: {
        "Content-Type": "application/json",
      }
    });

    console.log('[Products List By Email] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Products List By Email] Flask API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to fetch products: ${response.status}`,
          details: errorText
        }),
        { 
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const result = await response.json();
    console.log('[Products List By Email] Success:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error('[Products List By Email] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
