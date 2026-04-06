import { NextRequest } from "next/server";

/**
 * SSE Proxy for Entities Stream
 * This bypasses CORS by proxying SSE requests from the client through Next.js server
 */
export async function GET(request: NextRequest) {
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
    const flaskUrl = `${apiUrl}/v1/stream/entities`;

    console.log("[SSE Proxy - Entities] Connecting to Flask API:", flaskUrl);

    // Fetch from Flask API (server-to-server, no CORS issues)
    const response = await fetch(flaskUrl, {
      headers: {
        Accept: "text/event-stream",
      },
    });

    if (!response.ok) {
      console.error("[SSE Proxy - Entities] Flask API error:", response.status, response.statusText);
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
              console.log("[SSE Proxy - Entities] Stream ended");
              try {
                controller.close();
              } catch (e) {
                // Controller might already be closed by client disconnect
              }
              break;
            }

            // Forward the chunk to client
            const chunk = decoder.decode(value, { stream: true });
            try {
              controller.enqueue(new TextEncoder().encode(chunk));
            } catch (e) {
              // Client disconnected, stop reading
              console.log("[SSE Proxy - Entities] Client disconnected, stopping stream");
              break;
            }
          }
        } catch (error) {
          console.error("[SSE Proxy - Entities] Stream error:", error);
          try {
            controller.error(error);
          } catch (e) {
            // Controller might already be closed
          }
        } finally {
          try {
            reader.releaseLock();
          } catch (e) {
            // Ignore
          }
        }
      },
      cancel() {
        console.log("[SSE Proxy - Entities] Client cancelled stream");
      }
    });

    // Return SSE stream with proper headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering for Nginx
      },
    });
  } catch (error) {
    console.error("[SSE Proxy - Entities] Error:", error);
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
