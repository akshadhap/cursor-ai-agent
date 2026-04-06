import { NextRequest, NextResponse } from "next/server";
import { getPolarClient, getPolarClientOrNull } from "@/lib/polar";

/**
 * Syncs Polar meter credits to Firestore employee tokens
 * Called after successful checkout to update token allocations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityId, employeeId, productKey } = body;

    if (!entityId || !employeeId || !productKey) {
      return NextResponse.json(
        { error: "Missing required parameters: entityId, employeeId, productKey" },
        { status: 400 }
      );
    }

    // Check if Polar token is available (uses getPolarClientOrNull which handles env-specific tokens)
    const polarClient = getPolarClientOrNull();
    if (!polarClient) {
      console.warn("[Polar Sync Tokens] Polar access token not configured");
      return NextResponse.json(
        { error: "Polar integration not configured" },
        { status: 503 }
      );
    }

    const polar = getPolarClient();

    console.log("[Polar Sync Tokens] Fetching subscriptions and meters for entity:", entityId);

    // Add retry logic with delays since subscription might not be immediately available after checkout
    let allSubscriptions: any[] = [];
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    while (retryCount < maxRetries) {
      // Get subscriptions using the same endpoint as catalogue
      const subscriptionsResponse = await fetch(
        `${request.url.split('/api/polar')[0]}/api/polar/subscriptions?customerId=${entityId}`
      );

      if (!subscriptionsResponse.ok) {
        console.error("[Polar Sync Tokens] Failed to fetch subscriptions");
        return NextResponse.json(
          { error: "Failed to fetch subscriptions from Polar" },
          { status: 500 }
        );
      }

      allSubscriptions = await subscriptionsResponse.json();
      console.log(`[Polar Sync Tokens] Attempt ${retryCount + 1}: Found ${allSubscriptions.length} subscriptions`);

      // Check if we found the subscription for this product
      const productSubscription = allSubscriptions.find(
        (sub: any) => 
          sub.status === "active" && 
          sub.metadata?.productKey === productKey
      );

      if (productSubscription) {
        console.log("[Polar Sync Tokens] Found subscription:", productSubscription.id);
        break; // Success, exit retry loop
      }

      // If not found and we have retries left, wait and try again
      if (retryCount < maxRetries - 1) {
        console.log(`[Polar Sync Tokens] Subscription not found yet, waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
      retryCount++;
    }

    // Find the active subscription for this product (after retries)
    const productSubscription = allSubscriptions.find(
      (sub: any) => 
        sub.status === "active" && 
        sub.metadata?.productKey === productKey
    );

    if (!productSubscription) {
      console.warn("[Polar Sync Tokens] No active subscription found for product:", productKey);
      console.log("[Polar Sync Tokens] Available subscriptions:", JSON.stringify(allSubscriptions, null, 2));
      return NextResponse.json(
        { error: "No active subscription found for this product" },
        { status: 404 }
      );
    }

    console.log("[Polar Sync Tokens] Found subscription:", productSubscription.id);

    // Get customer meters using Polar API
    const metersIterator = await polar.customerMeters.list({
      externalCustomerId: entityId,
    });

    const allMeters: any[] = [];
    for await (const meter of metersIterator) {
      allMeters.push(meter);
    }

    console.log("[Polar Sync Tokens] Found meters:", allMeters.length);
    console.log("[Polar Sync Tokens] Meters data:", JSON.stringify(allMeters, null, 2));

    // Find the meter with the highest credited units (this is the token allocation)
    const meter = allMeters.reduce((max: any, current: any) => {
      return (current.creditedUnits > (max?.creditedUnits || 0)) ? current : max;
    }, null);

    if (!meter || !meter.creditedUnits || meter.creditedUnits === 0) {
      console.warn("[Polar Sync Tokens] No meter with positive credited units found");
      console.log("[Polar Sync Tokens] All meters:", JSON.stringify(allMeters, null, 2));
      return NextResponse.json(
        { error: "No token credits found for this customer" },
        { status: 404 }
      );
    }

    const tokenBalance = meter.creditedUnits;
    console.log("[Polar Sync Tokens] Meter balance (tokens):", tokenBalance);
    console.log("[Polar Sync Tokens] Meter ID:", meter.meterId);
    console.log("[Polar Sync Tokens] Credited units:", meter.creditedUnits);
    console.log("[Polar Sync Tokens] Consumed units:", meter.consumedUnits);

    // Normalize product key: convert hyphens to underscores for Entity API
    const normalizedProductKey = productKey
      .replace('chatbot-builder', 'chatbot_builder')
      .replace('voice-agent-builder', 'voice_agent')
      .replace(/-/g, '_');

    // Update tokens in Firestore via Entity API
    const entityApiOrigin = process.env.ENTITY_API_ORIGIN;
    if (!entityApiOrigin) {
      console.error("[Polar Sync Tokens] ENTITY_API_ORIGIN not configured");
      return NextResponse.json(
        { error: "Entity API not configured" },
        { status: 500 }
      );
    }

    const tokenUpdateUrl = `${entityApiOrigin}/v1/employees/${entityId}/${employeeId}/tokens/${normalizedProductKey}`;
    console.log("[Polar Sync Tokens] Updating tokens at:", tokenUpdateUrl);
    
    // First, verify the employee exists in Firestore
    const employeeCheckUrl = `${entityApiOrigin}/v1/entities/${entityId}/employees/${employeeId}`;
    console.log("[Polar Sync Tokens] Checking if employee exists:", employeeCheckUrl);
    
    const employeeCheckResponse = await fetch(employeeCheckUrl);
    if (!employeeCheckResponse.ok) {
      console.warn("[Polar Sync Tokens] Employee not found in Firestore:", employeeId);
      console.warn("[Polar Sync Tokens] The employee needs to be created in Firestore before tokens can be allocated");
      return NextResponse.json(
        { 
          error: "Employee not found in Firestore",
          message: "The employee needs to be synced from Convex to Firestore first",
          employeeId,
          tokens: tokenBalance
        },
        { status: 404 }
      );
    }
    
    console.log("[Polar Sync Tokens] ✓ Employee exists in Firestore");

    const tokenUpdateResponse = await fetch(tokenUpdateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        allocated: tokenBalance,
      }),
    });

    if (!tokenUpdateResponse.ok) {
      const errorText = await tokenUpdateResponse.text();
      console.error("[Polar Sync Tokens] Failed to update tokens:", errorText);
      return NextResponse.json(
        { error: "Failed to update tokens in Firestore" },
        { status: 500 }
      );
    }

    const result = await tokenUpdateResponse.json();
    console.log("[Polar Sync Tokens] Successfully updated tokens:", result);

    return NextResponse.json({
      success: true,
      tokens: tokenBalance,
      consumed: meter.consumedUnits || 0,
      meterId: meter.meterId,
    });

  } catch (error) {
    console.error("[Polar Sync Tokens] Error syncing tokens:", error);
    return NextResponse.json(
      { error: "Failed to sync tokens from Polar" },
      { status: 500 }
    );
  }
}
