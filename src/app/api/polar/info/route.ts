import { NextResponse } from "next/server";
import { getOrganizationId, getPolarClientOrNull } from "@/lib/polar";

export async function GET() {
  try {
    const polar = getPolarClientOrNull();
    if (!polar) {
      return NextResponse.json(
        { error: "Polar client not configured" },
        { status: 500 }
      );
    }

    // Get organization ID
    const organizationId = await getOrganizationId();

    // Get products
    let productIds: Array<{ id: any; name: any; description: any }> = [];
    try {
      const productsPage = await polar.products.list({
        organizationId: organizationId || undefined,
        limit: 100,
      });
      productIds = productsPage.result.items.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
      }));
    } catch (error) {
      console.error("Error fetching Polar products:", error);
    }

    return NextResponse.json({
      organizationId,
      products: productIds,
    });
  } catch (error: any) {
    console.error("Error fetching Polar info:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch Polar info" },
      { status: 500 }
    );
  }
}
