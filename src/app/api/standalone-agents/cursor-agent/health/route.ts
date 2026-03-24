import { NextResponse } from "next/server";

export async function GET() {
    try {
        const hasApiKey = !!process.env.GROQ_API_KEY;

        return NextResponse.json(
            {
                status: hasApiKey ? "ok" : "error",
                message: hasApiKey
                    ? "Backend is healthy and ready"
                    : "GROQ_API_KEY not configured",
                timestamp: new Date().toISOString(),
            },
            {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            }
        );
    } catch (error) {
        return NextResponse.json(
            {
                status: "error",
                message: "Health check failed",
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json(
        {},
        {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        }
    );
}
