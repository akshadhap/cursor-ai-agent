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

        // Structure Telegram update data
        const telegramPayload = {
            update_id: body.update_id,
            message: body.message || null,
            edited_message: body.edited_message || null,
            channel_post: body.channel_post || null,
            edited_channel_post: body.edited_channel_post || null,
            callback_query: body.callback_query || null,
            inline_query: body.inline_query || null,
            chosen_inline_result: body.chosen_inline_result || null,
            poll: body.poll || null,
            poll_answer: body.poll_answer || null,
            my_chat_member: body.my_chat_member || null,
            chat_member: body.chat_member || null,
            chat_join_request: body.chat_join_request || null,
            raw: body,
        };

        await sendWorkflowExecution({
            workflowId,
            initialData: {
                telegram: telegramPayload,  // Available as {{telegram.message.text}}, etc.
            },
        });

        return NextResponse.json(
            { success: true, message: "Telegram update received" },
            { status: 200 },
        );
    } catch (error) {
        console.error("Telegram webhook trigger error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to process Telegram webhook" },
            { status: 500 },
        );
    }
}

// Also support GET for webhook verification
export async function GET() {
    return NextResponse.json({
        name: "Telegram Webhook Trigger",
        method: "POST",
        description: "Receives Telegram bot updates to trigger workflows",
        setup: "Use setWebhook API: https://api.telegram.org/bot<TOKEN>/setWebhook?url=WEBHOOK_URL",
    });
}
