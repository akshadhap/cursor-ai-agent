import { NextRequest } from "next/server";

/**
 * API Proxy for entity product plan management
 * Handles upsert of product plans for entities
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string; productId: string; planId: string }> }
) {
  const { entityId, productId, planId } = await params;
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
    // Parse request body for any additional plan data
    let body: any = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      console.log('[Product Plan PUT] No body or invalid JSON, using empty object');
    }

    // Normalize product ID: convert hyphens to underscores for Entity API
    // Frontend uses: chatbot-builder, voice-agent-builder
    // Entity API expects: chatbot_builder, voice_agent
    const normalizedProductId = productId
      .replace('chatbot-builder', 'chatbot_builder')
      .replace('voice-agent-builder', 'voice_agent')
      .replace(/-/g, '_'); // Fallback: replace any remaining hyphens

    // Call Flask API: /v1/entities/{entity_id}/products/{product_id}/plans/{plan_id}
    const flaskUrl = `${apiUrl}/v1/entities/${entityId}/products/${normalizedProductId}/plans/${planId}`;
    
    console.log('[Product Plan PUT] Calling Flask API:', flaskUrl);
    console.log('[Product Plan PUT] Entity ID:', entityId);
    console.log('[Product Plan PUT] Product ID (original):', productId);
    console.log('[Product Plan PUT] Product ID (normalized):', normalizedProductId);
    console.log('[Product Plan PUT] Plan ID:', planId);
    console.log('[Product Plan PUT] Body:', body);

    const response = await fetch(flaskUrl, {
      method: 'PUT',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log('[Product Plan PUT] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Product Plan PUT] Flask API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to update product plan: ${response.status}`,
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
    console.log('[Product Plan PUT] Success:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error('[Product Plan PUT] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update product plan',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
