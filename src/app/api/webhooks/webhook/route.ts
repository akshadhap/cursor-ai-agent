import { sendWorkflowExecution } from "@/inngest/utils";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const workflowId = url.searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameter: workflowId" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));

    // You can structure this however you like; I'm using `webhook`
    const payload = {
      raw: body,
    };

    await sendWorkflowExecution({
      workflowId,
      initialData: {
        webhook: payload,  // 👈 will be available as `{{webhook.raw...}}`
      },
    });

    return NextResponse.json(
      { success: true },
      { status: 200 },
    );
  } catch (error) {
    console.error("Webhook trigger error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process webhook" },
      { status: 500 },
    );
  }
}
