import { NextRequest, NextResponse } from "next/server";
import { getPolarClient } from "@/lib/polar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ checkoutId: string }> }
) {
  try {
    const { checkoutId } = await params;
    const polar = getPolarClient();

    // Fetch checkout details from Polar
    const checkout = await polar.checkouts.get({ id: checkoutId });

    return NextResponse.json({
      id: checkout.id,
      status: checkout.status,
      metadata: checkout.metadata,
      customerId: checkout.customerId,
      url: checkout.url,
    });
  } catch (error) {
    console.error("Error fetching checkout:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { 
        error: "Failed to fetch checkout details",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
