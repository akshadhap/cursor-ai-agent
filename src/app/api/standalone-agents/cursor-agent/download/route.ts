import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { getCursorAgent } from "@/features/standalone-agents/agents/cursor-agent";
import JSZip from "jszip";
import fs from "fs/promises";
import path from "path";

/**
 * GET /api/standalone-agents/cursor-agent/download
 * Generate and download extension ZIP with user configuration
 */
export async function GET(req: NextRequest) {
    try {
        await requireAuth();

        const agentId = req.nextUrl.searchParams.get("agentId");
        if (!agentId) {
            return NextResponse.json(
                { error: "agentId is required" },
                { status: 400 }
            );
        }

        // Get agent configuration
        const agent = await getCursorAgent(agentId);
        if (!agent) {
            return NextResponse.json(
                { error: "Agent not found" },
                { status: 404 }
            );
        }

        // Create ZIP
        const zip = new JSZip();

        // Get extension dist directory path
        const extensionDistPath = path.join(
            process.cwd(),
            "src/features/standalone-agents/agents/cursor-agent/extension/dist"
        );

        try {
            // Check if dist exists
            await fs.access(extensionDistPath);

            // Read all files from dist directory recursively
            async function addDirectoryToZip(dirPath: string, zipFolder: JSZip) {
                const entries = await fs.readdir(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);

                    if (entry.isDirectory()) {
                        const subFolder = zipFolder.folder(entry.name);
                        if (subFolder) {
                            await addDirectoryToZip(fullPath, subFolder);
                        }
                    } else {
                        const fileContent = await fs.readFile(fullPath);
                        zipFolder.file(entry.name, fileContent);
                    }
                }
            }

            // Add all dist files
            await addDirectoryToZip(extensionDistPath, zip);

            // Add user-specific configuration
            const userConfig = {
                agentId: agent.id,
                userId: agent.userId,
                apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
                capabilities: agent.config?.capabilities || {},
                integrations: {
                    notion: { connected: agent.config?.integrations?.notion?.connected || false },
                    slack: { connected: agent.config?.integrations?.slack?.connected || false },
                    jira: { connected: agent.config?.integrations?.jira?.connected || false },
                },
            };

            zip.file("user-config.json", JSON.stringify(userConfig, null, 2));

            // Add README for user
            const readme = `# Cursor AI Extension - Installation Guide

## Installation Steps

1. Extract this ZIP file to a permanent location on your computer
2. Open Chrome and navigate to: chrome://extensions/
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extracted folder
6. The extension icon should appear in your Chrome toolbar

## Configuration

Your extension is pre-configured with:
- Agent ID: ${agent.id}
- Backend URL: ${userConfig.apiUrl}

## Usage

1. Navigate to any webpage
2. Select text (minimum 2 characters)
3. Click the cursor bubble that appears
4. Choose an AI action from the menu
5. View results in the side panel

## Capabilities Enabled

${Object.entries(userConfig.capabilities)
                    .filter(([_, enabled]) => enabled)
                    .map(([key]) => `- ${key}`)
                    .join('\n')}

## Support

For issues or questions, please contact support.

Generated on: ${new Date().toLocaleString()}
`;

            zip.file("README.txt", readme);

            // Generate ZIP buffer
            const zipBuffer = await zip.generateAsync({
                type: "nodebuffer",
                compression: "DEFLATE",
                compressionOptions: { level: 9 },
            });

            // Return ZIP file
            return new NextResponse(zipBuffer, {
                headers: {
                    "Content-Type": "application/zip",
                    "Content-Disposition": `attachment; filename="cursor-ai-extension-${agentId}.zip"`,
                    "Content-Length": zipBuffer.length.toString(),
                },
            });
        } catch (distError) {
            // If dist doesn't exist, create a minimal extension package
            console.warn("Extension dist not found, creating minimal package");

            // Add manifest
            const manifest = {
                manifest_version: 3,
                name: "Cursor AI Assistant",
                version: "1.0.0",
                description: "AI-powered cursor assistant",
                permissions: ["activeTab", "storage"],
                action: {
                    default_popup: "popup.html",
                },
                content_scripts: [
                    {
                        matches: ["<all_urls>"],
                        js: ["content.js"],
                    },
                ],
            };

            zip.file("manifest.json", JSON.stringify(manifest, null, 2));

            // Add basic popup HTML
            zip.file(
                "popup.html",
                `<!DOCTYPE html>
<html>
<head>
  <title>Cursor AI</title>
</head>
<body>
  <h1>Cursor AI Extension</h1>
  <p>Please build the extension first by running:</p>
  <code>npm run build:extension</code>
</body>
</html>`
            );

            // Add config
            zip.file(
                "config.json",
                JSON.stringify(
                    {
                        agentId: agent.id,
                        apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
                    },
                    null,
                    2
                )
            );

            const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

            return new NextResponse(zipBuffer, {
                headers: {
                    "Content-Type": "application/zip",
                    "Content-Disposition": `attachment; filename="cursor-ai-extension-${agentId}.zip"`,
                },
            });
        }
    } catch (error: any) {
        console.error("Error generating extension ZIP:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate extension package" },
            { status: 500 }
        );
    }
}
