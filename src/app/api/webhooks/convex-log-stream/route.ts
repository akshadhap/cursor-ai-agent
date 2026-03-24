import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Handle Convex log stream webhook
    console.log("Convex log stream:", body);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Convex log stream:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
