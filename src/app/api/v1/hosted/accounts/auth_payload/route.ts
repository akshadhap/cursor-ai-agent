/**
 * Unipile Hosted Auth Proxy - auth_payload endpoint
 * This proxies requests from Unipile's hosted auth page to their API
 */

import { NextRequest, NextResponse } from "next/server";

const getUnipileBaseUrl = () => {
    const dsn = process.env.UNIPILE_DSN || "api1.unipile.com:13111";
    return `https://${dsn}/api/v1`;
};

// Handle CORS preflight
export async function OPTIONS(req: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-KEY",
        },
    });
}

// Proxy POST requests
export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.UNIPILE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        const body = await req.json();
        const baseUrl = getUnipileBaseUrl();

        console.log(`[Unipile Proxy] Proxying auth_payload to ${baseUrl}`);

        const response = await fetch(`${baseUrl}/hosted/accounts/auth_payload`, {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await response.text();

        return new NextResponse(data, {
            status: response.status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("[Unipile Proxy] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Proxy failed" },
            {
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" }
            }
        );
    }
}

// Proxy GET requests
export async function GET(req: NextRequest) {
    try {
        const apiKey = process.env.UNIPILE_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: "API key not configured" }, { status: 500 });
        }

        const baseUrl = getUnipileBaseUrl();
        const url = new URL(req.url);

        console.log(`[Unipile Proxy] Proxying GET auth_payload to ${baseUrl}`);

        const response = await fetch(`${baseUrl}/hosted/accounts/auth_payload${url.search}`, {
            method: "GET",
            headers: {
                "X-API-KEY": apiKey,
            },
        });

        const data = await response.text();

        return new NextResponse(data, {
            status: response.status,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
        });
    } catch (error) {
        console.error("[Unipile Proxy] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Proxy failed" },
            {
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" }
            }
        );
    }
}
