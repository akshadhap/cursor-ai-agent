import { NextRequest, NextResponse } from "next/server";
import { getPolarClient } from "@/lib/polar";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  
  try {
    console.log("[Polar Product] Fetching product:", productId);
    
    const polar = getPolarClient();
    const response = await polar.products.get({ id: productId });
    
    console.log("[Polar Product] Success:", response?.name);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Polar Product] Error fetching product:", productId);
    console.error("[Polar Product] Error details:", error);
    console.error("[Polar Product] Error message:", (error as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch product details", details: (error as Error).message },
      { status: 500 }
    );
  }
}
