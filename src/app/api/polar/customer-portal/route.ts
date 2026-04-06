import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { getPolarClient, getPolarClientOrNull, ensureCustomerByExternalId } from "@/lib/polar";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const externalCustomerId = searchParams.get("externalCustomerId");

    if (!externalCustomerId) {
      return NextResponse.json(
        { error: "Missing externalCustomerId parameter" },
        { status: 400 }
      );
    }

    // Check if Polar token is available (uses getPolarClientOrNull which handles env-specific tokens)
    const polarClient = getPolarClientOrNull();
    if (!polarClient) {
      console.warn("[Polar Customer Portal] Polar access token not configured");
      return NextResponse.json(
        { error: "Polar integration not configured" },
        { status: 503 }
      );
    }

    // Fetch entity details from Convex to get email and name
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return NextResponse.json(
        { error: "Convex not configured" },
        { status: 503 }
      );
    }

    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    const entityDetails = await convex.query(api.public.entities.getEntity, {
      entityId: externalCustomerId,
    });

    if (!entityDetails) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    const entityEmail = entityDetails.email;
    const entityName = entityDetails.name;

    // Ensure customer exists before creating portal session
    await ensureCustomerByExternalId(externalCustomerId, {
      email: entityEmail,
      name: entityName,
    });

    const polar = getPolarClient();
    
    // Get base URL for return URL
    const url = new URL(request.url);
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    
    let returnBaseUrl: string;
    if (forwardedHost && forwardedProto) {
      returnBaseUrl = `${forwardedProto}://${forwardedHost}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      returnBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else {
      returnBaseUrl = url.origin;
    }
    
    const returnUrl = `${returnBaseUrl}/admin/billing`;
    
    console.log("[Polar Customer Portal] Creating session for:", externalCustomerId);

    // Create customer portal session
    const session = await polar.customerSessions.create({
      externalCustomerId,
      returnUrl,
    });

    // Redirect to Polar customer portal
    return NextResponse.redirect(session.customerPortalUrl, { status: 303 });
  } catch (error) {
    console.error("[Polar Customer Portal] Error:", error);
    return NextResponse.json(
      { error: "Failed to create customer portal session" },
      { status: 500 }
    );
  }
}
