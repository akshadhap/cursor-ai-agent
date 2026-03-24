// src/features/executions/components/agent/outreach/executor.ts
import { NonRetriableError } from "inngest";
import prisma from "@/lib/db";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { NodeExecutor } from "@/features/executions/types";
import { leadOutreachChannel } from "@/inngest/channels/lead-outreach";

type LeadOutreachConfig = {
  subjectTemplate?: string;
  bodyTemplate?: string;

  // internal defaults – not shown in UI
  inputPath?: string;     // where prioritized leads live in context
  variableName?: string;  // where to store outreachResult in context
};

type LeadOutreachNodeData = {
  config?: LeadOutreachConfig;
};

type OutreachResult = {
  leadId: string;
  email: string;
  priority?: number;
  score?: number;
  sent: boolean;
  error?: string;
  smtpMessageId?: string;
};

function getByPath(obj: any, path?: string): any {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

export const outreachExecutor: NodeExecutor<LeadOutreachNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    leadOutreachChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const cfg: LeadOutreachConfig = data?.config ?? (data as any) ?? {};

    const inputPath = cfg.inputPath || "leads";          // prioritized leads from prioritizer
    const variableName = cfg.variableName || "outreachResult";

    const subjectTemplate =
      cfg.subjectTemplate ||
      "Quick question about what you're building ";

    const bodyTemplate =
      cfg.bodyTemplate ||
      "I saw what you’re working on and thought this might be relevant...";

    // --- ENV KEYS ---------------------------------------------------
    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiKey) {
      throw new NonRetriableError(
        "Gemini API key missing. Add GOOGLE_GENERATIVE_AI_API_KEY to env.",
      );
    }

    const smtpApiKey = process.env.SMTP2GO_API_KEY;
    if (!smtpApiKey) {
      throw new NonRetriableError(
        "SMTP2GO_API_KEY missing. Add it to your environment.",
      );
    }

    const google = createGoogleGenerativeAI({ apiKey: geminiKey });

    // --- TEMPLATE CONFIG (from Google Form / template-config node) ---
    const templateConfig = (context as any).templateConfig ?? {};
    const fromEmail: string | undefined = templateConfig.senderEmail;

    if (!fromEmail) {
      throw new NonRetriableError(
        "Cold outreach: templateConfig.senderEmail is missing. Configure sender email in template config.",
      );
    }

    // --- READ PRIORITIZED LEADS FROM CONTEXT ------------------------
    const leads = getByPath(context, inputPath);

    if (!Array.isArray(leads) || leads.length === 0) {
      await publish(
        leadOutreachChannel().status({
          nodeId,
          status: "success",
          message: "No leads found for outreach",
        }),
      );
      return context;
    }

    // We expect each item to have at least { leadId, priority?, score? }
    type LeadItem = { leadId: string; priority?: number; score?: number };

    const typedLeads: LeadItem[] = leads.filter(
      (l: any): l is LeadItem => typeof l?.leadId === "string",
    );

    if (typedLeads.length === 0) {
      await publish(
        leadOutreachChannel().status({
          nodeId,
          status: "success",
          message: "No leads with leadId found for outreach",
        }),
      );
      return context;
    }

    // Sort by priority (1 = highest). If no priority, fall back to score desc.
    typedLeads.sort((a, b) => {
      if (a.priority != null && b.priority != null) {
        return a.priority - b.priority;
      }
      if (a.score != null && b.score != null) {
        return b.score - a.score;
      }
      return 0;
    });

    // ✅ Queue guard: only one email per email address *per execution*
    const sentEmailsThisExecution = new Set<string>();

    const buildPrompt = (leadRow: any) => `
You are a world-class SDR writing highly personalized cold emails for a B2B SaaS product.

You will receive:
- Full lead record (name, role, company, contact info, score, priority, etc.)
- Template configuration for the company sending the email (product, value prop, Calendly link, etc.)
- A SUBJECT TEMPLATE and BODY TEMPLATE that describe the tone + structure the customer wants.

Your job:
1. Understand the lead, their role, company, and potential pain points.
2. Understand the sending company's value proposition.
3. Use the subjectTemplate and bodyTemplate as a STYLE + STRUCTURE hint, not as literal text.
4. Generate a final cold email as JSON with this exact shape:

{
  "lead_name": "The lead's name here",
  "body": "Multi-line email body here",
  "calendly_link": "https://calendly.com/your-company/15min-demo",
  "client_name": "The company you're sending from",
  "subject": "How's everything going?"
}

Rules:
- All 5 keys MUST be present: lead_name, body, calendly_link, client_name, subject.
- Values must all be strings.


Rules:
- No salutations like "Hi [Name]," in body.
- Subject must be concise, specific, and personalized.
- Body must be short, concrete, and non-spammy.
- Include a single clear CTA (usually to book a call via Calendly if present).
- Never invent fake company names or URLs.
- Do NOT include JSON comments.
- Do NOT wrap the JSON in backticks or code fences.

--------------------
LEAD:
${JSON.stringify(leadRow, null, 2)}

TEMPLATE CONFIG (SENDER COMPANY):
${JSON.stringify(templateConfig, null, 2)}

SUBJECT TEMPLATE:
${subjectTemplate}

BODY TEMPLATE:
${bodyTemplate}

Return ONLY valid JSON with exactly these 5 keys:
"lead_name", "body", "calendly_link", "client_name", "subject".

`;

    const results: OutreachResult[] = [];
    const allSteps: any[] = [];

    // --- PROCESS EACH LEAD IN PRIORITY ORDER (QUEUE STYLE) ----------
    for (const leadItem of typedLeads) {
      const leadRow = await prisma.lead.findUnique({
        where: { id: leadItem.leadId },
      });

      if (!leadRow) {
        results.push({
          leadId: leadItem.leadId,
          email: "",
          priority: leadItem.priority,
          score: leadItem.score,
          sent: false,
          error: "Lead not found in database",
        });
        continue;
      }

      const emailAddress = (leadRow.email || "").toLowerCase().trim();

      if (!emailAddress) {
        results.push({
          leadId: leadRow.id,
          email: "",
          priority: leadItem.priority,
          score: leadItem.score ?? leadRow.score,
          sent: false,
          error: "Lead has no email",
        });
        continue;
      }

      // ✅ Queue rule #1: never resend if this lead already has an emailStatus !== NOT_SENT
      //    This prevents duplicates across executions.
      if (leadRow.emailStatus && leadRow.emailStatus !== "NOT_SENT") {
        results.push({
          leadId: leadRow.id,
          email: leadRow.email,
          priority: leadItem.priority,
          score: leadItem.score ?? leadRow.score,
          sent: false,
          error: `Email already sent previously (status: ${leadRow.emailStatus}). Skipping.`,
        });
        continue;
      }

      // ✅ Queue rule #2: skip duplicate email address *inside this execution*
      if (sentEmailsThisExecution.has(emailAddress)) {
        results.push({
          leadId: leadRow.id,
          email: leadRow.email,
          priority: leadItem.priority,
          score: leadItem.score ?? leadRow.score,
          sent: false,
          error: "Email already sent to this address in this execution; skipped duplicate.",
        });
        continue;
      }

      sentEmailsThisExecution.add(emailAddress);

      // Build prompt input for Gemini
      const leadForPrompt = {
        ...leadRow,
        priority: leadItem.priority,
        score: leadItem.score ?? leadRow.score,
      };

      // --- Use Gemini to generate subject + body --------------------
      const { steps: geminiSteps } = await step.ai.wrap(
        "cold-outreach-gemini-generate",
        generateText,
        {
          model: google("gemini-2.0-flash"),
          prompt: buildPrompt(leadForPrompt),
          experimental_telemetry: {
            isEnabled: true,
            recordInputs: true,
            recordOutputs: true,
          },
        },
      );
      
      // Collect steps for token tracking
      if (geminiSteps && Array.isArray(geminiSteps)) {
        allSteps.push(...geminiSteps);
      }

      let rawText = "";
      const firstStep = geminiSteps?.[0];
      if (firstStep?.content) {
        for (const part of firstStep.content) {
          if (part.type === "text") rawText += part.text;
        }
      }
      rawText = rawText.trim();

      let cleaned = rawText;
      if (cleaned.startsWith("```")) {
        cleaned = cleaned
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/, "")
          .trim();
      }

     // Defaults if Gemini fails
let subject = subjectTemplate;
let body = bodyTemplate;

let templateData = {
  lead_name: (leadRow as any).name ?? (leadRow as any).fullName ?? leadRow.email,
  body,
  calendly_link: templateConfig.calendlyUrl ?? "",
  client_name: templateConfig.companyName ?? "",
  subject,
};

try {
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  if (parsed && typeof parsed === "object") {
    if (typeof parsed.subject === "string") templateData.subject = parsed.subject;
    if (typeof parsed.body === "string") templateData.body = parsed.body;
    if (typeof parsed.lead_name === "string") templateData.lead_name = parsed.lead_name;
    if (typeof parsed.calendly_link === "string")
      templateData.calendly_link = parsed.calendly_link;
    if (typeof parsed.client_name === "string")
      templateData.client_name = parsed.client_name;
  }
} catch {
  // If JSON parsing fails, fall back to defaults
}

// Keep local vars in sync for logging / DB
subject = templateData.subject;
body = templateData.body;

// --- SEND VIA SMTP2GO TEMPLATE 7548901 ------------------------
const payload = {
  api_key: smtpApiKey,
  sender: fromEmail,
  to: [leadRow.email],
  template_id: "7548901",
  template_data: templateData,
  // optional: set for logs/activity
  subject,
  text_body: body,
};



      let sent = false;
      let smtpMessageId: string | undefined;
      let error: string | undefined;

      try {
        const res = await fetch("https://api.smtp2go.com/v3/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const json = (await res.json()) as any;

        const succeeded = json?.data?.succeeded ?? 0;
        sent = succeeded > 0;
        smtpMessageId = json?.data?.messages?.[0]?.message_id;

        if (!sent) {
          error =
            json?.data?.error ??
            json?.error ??
            "SMTP2GO send did not succeed";
        }
      } catch (e: any) {
        sent = false;
        error = e?.message || "Failed to call SMTP2GO";
      }

      // Update DB emailStatus so future executions see this as "done"
      await prisma.lead.update({
        where: { id: leadRow.id },
        data: {
          emailStatus: sent ? "SENT" : "BOUNCED",
          lastActivityAt: new Date(),
        },
      });

      results.push({
        leadId: leadRow.id,
        email: leadRow.email,
        priority: leadItem.priority,
        score: leadItem.score ?? leadRow.score,
        sent,
        error,
        smtpMessageId,
      });
    }

    // --- WRITE RESULT INTO CONTEXT UNDER variableName ---------------
    const nextContext = {
      ...context,
      [variableName]: results,
      steps: allSteps, // Include steps for token tracking
    };
    
    // Clean up to avoid context pollution
    delete (nextContext as any).agentTokens;

    await publish(
      leadOutreachChannel().status({
        nodeId,
        status: "success",
        message: `Sent outreach to ${results.filter((r) => r.sent).length}/${
          results.length
        } lead(s)`,
      }),
    );

    return nextContext;
  } catch (err) {
    await publish(
      leadOutreachChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw err;
  }
};
