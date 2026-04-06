import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SSE endpoint to stream workflow generation progress
 * Polls database for changes and streams them to client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id as string;
    
    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get("workflowId");

    if (!workflowId) {
      return new Response("Missing workflowId", { status: 400 });
    }

    // Verify workflow ownership
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId, userId },
    });

    if (!workflow) {
      return new Response("Workflow not found", { status: 404 });
    }

    const encoder = new TextEncoder();
    let lastNodeCount = 0;
    let lastConnectionCount = 0;
    let pollCount = 0;
    const maxPolls = 120; // 2 minutes max (120 * 1 second)

    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        
        const safeClose = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (err) {
              console.log('Controller already closed:', err);
            }
          }
        };
        
        const pollInterval = setInterval(async () => {
          try {
            if (isClosed) {
              clearInterval(pollInterval);
              return;
            }
            
            pollCount++;

            // Check if workflow has been updated
            const updated = await prisma.workflow.findUnique({
              where: { id: workflowId },
              include: {
                nodes: true,
                connections: true,
              },
            });

            if (!updated) {
              clearInterval(pollInterval);
              safeClose();
              return;
            }

            const currentNodeCount = updated.nodes.length;
            const currentConnectionCount = updated.connections.length;

            // Send update if counts changed
            if (
              currentNodeCount !== lastNodeCount ||
              currentConnectionCount !== lastConnectionCount
            ) {
              const newNodes = currentNodeCount - lastNodeCount;
              const newConnections = currentConnectionCount - lastConnectionCount;

              // Extract recommendations from stickyNotes metadata
              const metadata = updated.stickyNotes as any;
              let recommendations: string[] = [];
              
              console.log('📊 SSE: Checking for recommendations in metadata:', metadata);
              
              // Check if there's an action file entry with recommendations
              if (Array.isArray(metadata)) {
                const actionFileEntry = metadata.find((n: any) => n.__actionFile);
                console.log('📂 SSE: Action file entry:', actionFileEntry);
                if (actionFileEntry && actionFileEntry.__recommendations) {
                  recommendations = actionFileEntry.__recommendations;
                  console.log('💡 SSE: Found recommendations:', recommendations);
                } else {
                  console.warn('⚠️ SSE: No recommendations in action file entry');
                }
              } else {
                console.warn('⚠️ SSE: Metadata is not an array');
              }

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "workflow-update",
                    nodeCount: currentNodeCount,
                    connectionCount: currentConnectionCount,
                    newNodes,
                    newConnections,
                    recommendations,
                    timestamp: Date.now(),
                  })}\n\n`
                )
              );

              lastNodeCount = currentNodeCount;
              lastConnectionCount = currentConnectionCount;
            }

            // Check for completion - look for action file metadata in stickyNotes
            const metadata = updated.stickyNotes as any;
            let isComplete = false;
            
            if (Array.isArray(metadata)) {
              // Check if action file was generated (indicates completion)
              isComplete = metadata.some((n: any) => n.__actionFile && n.__actionFileGeneratedAt);
            }
            
            if (isComplete) {
              // Extract recommendations for completion event
              let recommendations: string[] = [];
              
              console.log('✅ SSE: Generation complete, extracting recommendations');
              
              if (Array.isArray(metadata)) {
                const actionFileEntry = metadata.find((n: any) => n.__actionFile);
                console.log('📂 SSE: Action file entry for completion:', actionFileEntry);
                if (actionFileEntry && actionFileEntry.__recommendations) {
                  recommendations = actionFileEntry.__recommendations;
                  console.log('💡 SSE: Sending recommendations in completion event:', recommendations);
                } else {
                  console.warn('⚠️ SSE: No recommendations found in completion event');
                }
              }
              
              // Generation complete
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "generation-complete",
                    nodeCount: currentNodeCount,
                    connectionCount: currentConnectionCount,
                    recommendations,
                  })}\n\n`
                )
              );

              clearInterval(pollInterval);
              safeClose();
              return;
            }
            
            // Check for error in workflow metadata
            if (Array.isArray(metadata)) {
              const errorEntry = metadata.find((n: any) => n.__error);
              if (errorEntry) {
                console.error('❌ SSE: Error detected in workflow:', errorEntry.__error);
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "error",
                      message: errorEntry.__error,
                    })}\n\n`
                  )
                );
                clearInterval(pollInterval);
                safeClose();
                return;
              }
            }

            // Timeout after max polls
            if (pollCount >= maxPolls) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "timeout",
                    message: "Generation took too long",
                  })}\n\n`
                )
              );

              clearInterval(pollInterval);
              safeClose();
            }
          } catch (error) {
            console.error("Progress poll error:", error);
            clearInterval(pollInterval);
            safeClose();
          }
        }, 1000); // Poll every second

        // Cleanup on client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(pollInterval);
          safeClose();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Progress API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
