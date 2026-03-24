import { NextRequest, NextResponse } from "next/server";

// Configure for large file uploads
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

// Disable default body parser to handle large files manually
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log("[Upload] Proxy request received");
    
    // Parse formData with streaming to avoid body size limits
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const uploadUrl = formData.get("uploadUrl") as string;

    if (!file || !uploadUrl) {
      console.error("[Upload] Missing file or uploadUrl");
      return NextResponse.json(
        { error: "Missing file or upload URL" },
        { status: 400 }
      );
    }

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`[Upload] Proxying: ${file.name} (${fileSizeMB} MB)`);

    // Convert File to Buffer for server-side upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`[Upload] Buffer created: ${buffer.length} bytes`);
    console.log(`[Upload] Uploading to Convex: ${uploadUrl.substring(0, 60)}...`);

    // Proxy the upload to Convex storage
    const uploadResult = await fetch(uploadUrl, {
      method: "POST",
      body: buffer,
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
      },
    });

    console.log(`[Upload] Convex response: ${uploadResult.status} ${uploadResult.statusText}`);

    if (!uploadResult.ok) {
      const errorText = await uploadResult.text();
      console.error("[Upload] Convex upload failed:", errorText);
      return NextResponse.json(
        { error: `Upload failed: ${uploadResult.statusText}` },
        { status: uploadResult.status }
      );
    }

    const { storageId } = await uploadResult.json();
    console.log(`[Upload] ✓ Success! Storage ID: ${storageId}`);

    return NextResponse.json({ storageId });
  } catch (error) {
    console.error("[Upload] Proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
