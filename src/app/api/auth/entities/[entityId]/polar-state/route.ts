import { NextRequest, NextResponse } from "next/server";
import { getCustomerStateByExternalId } from "@/lib/polar";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    
    // Use entityId as the externalId in Polar
    const customerState = await getCustomerStateByExternalId(entityId);
    
    if (!customerState) {
      return NextResponse.json(
        { error: "Customer not found in Polar" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(customerState);
  } catch (error: any) {
    console.error("Error fetching Polar customer state:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Polar state" },
      { status: 500 }
    );
  }
}
