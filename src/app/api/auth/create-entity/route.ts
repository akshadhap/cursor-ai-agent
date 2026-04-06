import { NextRequest } from "next/server";

function getConvexUrl() {
  const convexUrl =
    process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL/NEXT_PUBLIC_CONVEX_URL not set");
  }
  return convexUrl.replace(/\/+$/, "");
}

// Helper to call Convex mutations via HTTP (works in all server environments)
async function callConvexMutation(functionName: string, args: any) {
  const convexUrl = getConvexUrl();

  const response = await fetch(`${convexUrl}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: functionName, args, format: "json" }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Convex mutation failed: ${error}`);
  }

  return await response.json();
}

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      entityName,
      firstName,
      lastName,
      phoneNumber,
      websiteUrl,
      address,
      autoRechargeEnabled,
      tags,
      userId,
    } = await req.json();

    // Basic validation
    if (!email || !entityName || !firstName || !lastName || !phoneNumber) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Transform address to match Convex schema
    const convexAddress = address ? {
      line1: address.street || address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      zip: address.zipCode || address.zip,
      country: address.country,
    } : undefined;

    const result = await callConvexMutation("public/entities:createEntity", {
      name: entityName,
      email,
      firstName,
      lastName,
      phoneNumber,
      websiteUrl,
      address: convexAddress,
      autoRechargeEnabled: autoRechargeEnabled ?? false,
      tags: tags ?? [],
      userId,
    });

    return Response.json({
      entityId: result.entityId,
      employeeId: result.employeeId,
    });
  } catch (error) {
    console.error("❌ Create entity error", error);
    
    // Handle specific Convex errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes("Entity already exists")) {
      return Response.json(
        { error: "An entity with this email or website already exists" },
        { status: 409 }
      );
    }
    
    return Response.json(
      { error: errorMessage || "Internal server error" },
      { status: 500 }
    );
  }
}
