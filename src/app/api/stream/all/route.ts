import { NextRequest } from "next/server";

/**
 * SSE Proxy for Multiple Collections
 * Proxies SSE requests to Flask API to bypass CORS
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const collections = searchParams.get("collections");
  
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

  if (!collections) {
    return new Response(
      JSON.stringify({ error: "Missing 'collections' query parameter" }),
      { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const flaskUrl = `${apiUrl}/v1/stream/all?collections=${collections}`;
    console.log("[SSE Proxy] Connecting to Flask API:", flaskUrl);

    const response = await fetch(flaskUrl, {
      headers: {
        Accept: "text/event-stream",
      },
    });

    if (!response.ok) {
      console.error("[SSE Proxy] Flask API error:", response.status, response.statusText);
      return new Response(
        JSON.stringify({ 
          error: `Flask API returned ${response.status}`,
          details: response.statusText 
        }),
        { 
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    if (!response.body) {
      return new Response(
        JSON.stringify({ error: "No response body from Flask API" }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Stream the SSE data from Flask to client
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log("[SSE Proxy] Stream ended");
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (error) {
          console.error("[SSE Proxy] Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[SSE Proxy] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to connect to Flask API",
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
