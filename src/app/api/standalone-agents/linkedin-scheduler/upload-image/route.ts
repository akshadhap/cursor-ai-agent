/**
 * Image Upload API - Upload images to ImgBB
 * 
 * ImgBB is free and simple to use:
 * - Get your API key at: https://api.imgbb.com/
 * - Add to .env: IMGBB_API_KEY=your_api_key
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getUserFromToken } from "@/lib/auth-utils";

// ImgBB upload function
async function uploadToImgBB(base64Data: string, filename?: string): Promise<string> {
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
        throw new Error("IMGBB_API_KEY not configured. Get one free at https://api.imgbb.com/");
    }

    // Remove data URL prefix if present
    let imageData = base64Data;
    if (base64Data.startsWith("data:")) {
        imageData = base64Data.split(",")[1];
    }

    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", imageData);
    if (filename) {
        formData.append("name", filename);
    }
    // Optional: Set expiration (in seconds) - remove for permanent storage
    // formData.append("expiration", "15552000"); // 180 days

    const response = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
    });

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error?.message || "Failed to upload to ImgBB");
    }

    // Return the direct image URL
    return result.data.url;
}

// Fallback: Return base64 as data URL (for development without API key)
function storeBase64Image(base64Data: string): string {
    if (base64Data.startsWith("data:")) {
        return base64Data;
    }
    return `data:image/png;base64,${base64Data}`;
}

export async function POST(req: NextRequest) {
    try {
        await requireAuth();
        const session = await getUserFromToken();

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { image, filename } = await req.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        let imageUrl: string;
        let provider: string;

        // Check if ImgBB is configured
        if (process.env.IMGBB_API_KEY) {
            // Upload to ImgBB
            imageUrl = await uploadToImgBB(image, filename);
            provider = "imgbb";
        } else {
            // Fallback to base64 (not recommended for production)
            imageUrl = storeBase64Image(image);
            provider = "base64";
            console.warn("[Image Upload] IMGBB_API_KEY not set. Using base64 fallback.");
        }

        return NextResponse.json({
            success: true,
            url: imageUrl,
            provider,
        });
    } catch (error) {
        console.error("[Image Upload] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to upload image" },
            { status: 500 }
        );
    }
}
