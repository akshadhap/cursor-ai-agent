import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await context.params;

  if (!entityId) {
    return NextResponse.json(
      { error: "Entity ID is required" },
      { status: 400 }
    );
  }

  try {
    const flaskApiUrl = process.env.FLASK_API_URL || "https://qa-entity-api-api-h4cbfyldoa-uc.a.run.app";
    const url = `${flaskApiUrl}/v1/entities/${entityId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Flask API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching entity data:", error);
    return NextResponse.json(
      { error: "Failed to fetch entity data" },
      { status: 500 }
    );
  }
}
