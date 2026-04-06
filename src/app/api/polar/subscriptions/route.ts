import { NextRequest, NextResponse } from "next/server";
import { getPolarClient, getPolarClientOrNull } from "@/lib/polar";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "Missing customerId parameter" },
        { status: 400 }
      );
    }

    // Check if Polar token is available (uses getPolarClientOrNull which handles env-specific tokens)
    const polarClient = getPolarClientOrNull();
    if (!polarClient) {
      console.warn("[Polar Subscriptions] Polar access token not configured");
      return NextResponse.json(
        { error: "Polar integration not configured" },
        { status: 503 }
      );
    }

    const polar = getPolarClient();

    // List all subscriptions for this customer (external_customer_id)
    const iterator = await polar.subscriptions.list({
      externalCustomerId: customerId,
      limit: 100, // Get all subscriptions
    });

    // Collect all subscriptions from the iterator
    const allSubscriptions: any[] = [];
    for await (const subscription of iterator) {
      allSubscriptions.push(subscription);
    }

    // Filter to only active subscriptions with metadata
    const activeSubscriptions = allSubscriptions.filter(
      (sub: any) => sub.status === "active" && sub.metadata
    );

    return NextResponse.json(activeSubscriptions);
  } catch (error) {
    console.error("[Polar Subscriptions] Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}
