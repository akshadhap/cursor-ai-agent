import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

export const runtime = "nodejs"; // Required for streaming
export const maxDuration = 300; // 5 minutes

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Fallback endpoint for chunked uploads when direct signed URL fails (CORS/network).
 * Streams chunks to Convex storage without buffering entire file in memory.
 *
 * This endpoint is automatically used when:
 * 1. Direct signed URL upload fails with CORS error
 * 2. Direct signed URL returns 403/404/502
 * 3. Network errors prevent direct upload
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const origin = request.headers.get("origin") || "unknown";

  console.log(`[upload-chunk] ${timestamp} Request from origin: ${origin}`);
  console.log(`[upload-chunk] Headers:`, {
    contentType: request.headers.get("content-type"),
    contentLength: request.headers.get("content-length"),
    userAgent: request.headers.get("user-agent")?.substring(0, 50),
  });

  try {
    const formData = await request.formData();
    const chunk = formData.get("chunk") as File;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const totalChunks = parseInt(formData.get("totalChunks") as string);
    const filename = formData.get("filename") as string;

    if (!chunk) {
      console.error(`[upload-chunk] Missing chunk in request`);
      return NextResponse.json({ error: "Missing chunk" }, { status: 400 });
    }

    if (isNaN(chunkIndex) || isNaN(totalChunks)) {
      console.error(`[upload-chunk] Invalid chunk metadata: chunkIndex=${chunkIndex}, totalChunks=${totalChunks}`);
      return NextResponse.json({ error: "Invalid chunk metadata" }, { status: 400 });
    }

    const chunkSize = chunk.size;
    console.log(`[upload-chunk] Chunk ${chunkIndex + 1}/${totalChunks} size: ${(chunkSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`[upload-chunk] Filename: ${filename}`);

    // Generate fresh signed URL for this chunk
    // Note: Each chunk gets a fresh URL to avoid expiry issues
    console.log(`[upload-chunk] Generating signed upload URL from Convex...`);
    const uploadUrl = await convex.mutation(api.private.files.generateUploadUrl);
    console.log(`[upload-chunk] Generated upload URL: ${uploadUrl.substring(0, 60)}...`);

    // Convert File to Buffer for streaming upload
    // Note: We use arrayBuffer() which is more memory-efficient than alternatives
    const buffer = Buffer.from(await chunk.arrayBuffer());

    console.log(`[upload-chunk] Streaming ${buffer.length} bytes to Convex storage...`);

    // Stream chunk to Convex storage (no memory buffering beyond this chunk)
    // Uses native fetch with Buffer body for efficient streaming
    const uploadStartTime = Date.now();
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: buffer,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(buffer.length),
      },
    });

    const uploadDuration = Date.now() - uploadStartTime;
    console.log(`[upload-chunk] Upload completed in ${uploadDuration}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[upload-chunk] ❌ Convex storage upload failed:`);
      console.error(`[upload-chunk]   Status: ${response.status} ${response.statusText}`);
      console.error(`[upload-chunk]   Error body: ${errorText.substring(0, 500)}`);

      return NextResponse.json(
        { error: `Storage upload failed: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    const storageId = result.storageId;

    console.log(`[upload-chunk] ✓ Chunk ${chunkIndex + 1}/${totalChunks} uploaded to storage: ${storageId}`);
    console.log(`[upload-chunk] Upload speed: ${(chunkSize / 1024 / 1024 / (uploadDuration / 1000)).toFixed(2)} MB/s`);

    return NextResponse.json(
      {
        storageId,
        chunkIndex,
        totalChunks,
        uploadDurationMs: uploadDuration,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );

  } catch (error) {
    console.error(`[upload-chunk] ❌ Server error:`, error);
    console.error(`[upload-chunk]   Error type: ${error?.constructor?.name}`);
    console.error(`[upload-chunk]   Error stack:`, error instanceof Error ? error.stack : 'N/A');

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        type: error?.constructor?.name || 'UnknownError',
      },
      { status: 500 }
    );
  }
}
