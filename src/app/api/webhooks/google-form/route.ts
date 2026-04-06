// src/app/api/webhooks/google-form/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendWorkflowExecution } from "@/inngest/utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // This is the raw payload you're logging:
    // {
    //   formId, formTitle, responseId, respondentEmail, responses, timestamp
    // }
    const responses = body.responses ?? {};

    const googleForm = {
      formId: body.formId,
      formTitle: body.formTitle ?? "",
      responseId: body.responseId,
      respondentEmail: body.respondentEmail ?? "",
      responses,
      timestamp: body.timestamp,
      raw: body,
    };

    // 🔥 Map responses into a clean `lead` object
    const lead = {
      name:
        responses["Full Name"] ??
        "",
      email:
        responses["Email Address"] ??
        body.respondentEmail ??
        "",
      company:
        responses["Company Name"] ??
        "",
      companySize:
        responses["Company Size"] ??
        "",
      role:
        responses["Your Role / Job Title"] ??
        "",
      budget:
        responses["Estimated Monthly Budget"] ??
        "",
      timeline:
        responses["How soon are you planning to start?"] ??
        "",
      heardFrom:
        responses["How did you hear about us?"] ??
        "",
      phone:
        responses["Phone Number (Optional)"] ??
        "",
      message:
        responses["What are you looking for / main use case?"] ??
        "",
      raw: googleForm,
    };

    // You probably pass workflowId as a query param ?workflowId=...
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get("workflowId");

    if (!workflowId) {
      return NextResponse.json(
        { error: "Missing workflowId in query params" },
        { status: 400 },
      );
    }

    await sendWorkflowExecution({
      workflowId,
      initialData: {
        googleForm,
        lead,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Google Form webhook error", err);
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 },
    );
  }
}
