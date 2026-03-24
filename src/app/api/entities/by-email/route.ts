import { NextRequest, NextResponse } from "next/server";

/**
 * API Route to get entity ID by employee email
 * This bypasses CORS by proxying requests from the client through Next.js server
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");
  
  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 }
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!apiUrl) {
    return NextResponse.json(
      { error: "API URL not configured" },
      { status: 500 }
    );
  }

  try {
    const flaskUrl = `${apiUrl}/v1/entities/by-employee-email?email=${encodeURIComponent(email)}`;
    
    console.log("[Entity Lookup] Fetching from Flask API:", flaskUrl);

    const response = await fetch(flaskUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Entity Lookup] Flask API error:", response.status, errorText);
      return NextResponse.json(
        { 
          error: `Flask API returned ${response.status}`,
          details: errorText 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("[Entity Lookup] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch entity ID",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
