// src/features/executions/components/agent/followups/executor.ts
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import prisma from "@/lib/db";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { NodeExecutor } from "@/features/executions/types";
import { leadFollowupsChannel } from "@/inngest/channels/lead-followups";

type LeadFollowupsConfig = {
  variableName?: string;
  inputPath?: string;
};

type LeadFollowupsData = {
  config?: LeadFollowupsConfig;
};

type TemplateFollowup = {
  daysOffset?: number;        // interpreted as DAYS (real followup delay)
  subjectTemplate?: string;
  bodyTemplate?: string;
};


type TemplateConfig = {
  senderEmail?: string;
  companyName?: string;
  companyDescription?: string;
  calendlyUrl?: string;
  followups?: TemplateFollowup[];
  numberOfFollowups?: number;
};

// Helpers
function getByPath(obj: any, path?: string): any {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function setByPath(obj: any, path: string, value: unknown): any {
  const clone = structuredClone(obj);
  const parts = path.split(".");
  let curr: any = clone;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    curr[key] = curr[key] ?? {};
    curr = curr[key];
  }

  curr[parts[parts.length - 1]] = value;
  return clone;
}

export const followupsExecutor: NodeExecutor<LeadFollowupsData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    leadFollowupsChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const cfg = data?.config ?? {};
    const variableName = cfg.variableName || "followupResult";
    const inputPath = cfg.inputPath || "leads";

    // --- ENV KEYS ---------------------------------------------------
    const smtpApiKey = process.env.SMTP2GO_API_KEY;
    if (!smtpApiKey) {
      throw new NonRetriableError(
        "Followups: SMTP2GO_API_KEY is missing. Add it to your environment.",
      );
    }

    const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiKey) {
      throw new NonRetriableError(
        "Followups: GOOGLE_GENERATIVE_AI_API_KEY is missing.",
      );
    }

    const google = createGoogleGenerativeAI({ apiKey: geminiKey });

    // --- TEMPLATE CONFIG FROM CONTEXT -------------------------------
    const templateConfig: TemplateConfig =
      ((context as any).templateConfig as TemplateConfig) || {};

    const fromEmail = templateConfig.senderEmail;
    if (!fromEmail) {
      throw new NonRetriableError(
        "Followups: templateConfig.senderEmail is missing. Configure sender email in template config.",
      );
    }

    const followups = Array.isArray(templateConfig.followups)
      ? templateConfig.followups
      : [];

    if (followups.length === 0) {
      await publish(
        leadFollowupsChannel().status({
          nodeId,
          status: "success",
          message: "No followups configured in templateConfig",
        }),
      );
      return context;
    }

    const maxFollowups =
      typeof templateConfig.numberOfFollowups === "number"
        ? Math.min(templateConfig.numberOfFollowups, followups.length)
        : followups.length;

    if (maxFollowups <= 0) {
      await publish(
        leadFollowupsChannel().status({
          nodeId,
          status: "success",
          message: "numberOfFollowups is 0 – nothing to send",
        }),
      );
      return context;
    }

    // Pre-compile followup templates (used as style hints for Gemini)
    const compiledFollowups = followups.slice(0, maxFollowups).map((f, idx) => {
      const subjectTpl =
        f.subjectTemplate ||
        `Quick follow-up #${idx + 1} from {{templateConfig.companyName}}`;
      const bodyTpl =
        f.bodyTemplate ||
        `Hi {{lead.name}},\n\nJust checking in again.\n\nBest,\n{{templateConfig.companyName}}`;

      return {
        delayDays: f.daysOffset ?? 0,
        rawSubjectTemplate: subjectTpl,
        rawBodyTemplate: bodyTpl,
        subjectFn: Handlebars.compile(subjectTpl),
        bodyFn: Handlebars.compile(bodyTpl),
      };
    });

    // --- LEADS FROM CONTEXT -----------------------------------------
    const leads = getByPath(context, inputPath);

    if (!leads) {
      await publish(
        leadFollowupsChannel().status({
          nodeId,
          status: "success",
          message: "No leads found for followups",
        }),
      );
      return context;
    }

    const leadArrayRaw: any[] = Array.isArray(leads) ? leads : [leads];

    // Dedupe leads by leadId to avoid multiple entries for same lead in context
    const leadMap = new Map<string, any>();
    for (const l of leadArrayRaw) {
      const id = l.leadId || l.id;
      if (!id) continue;
      if (!leadMap.has(id)) leadMap.set(id, l);
    }
    const leadArray = Array.from(leadMap.values());

   type FollowupHistoryItem = {
  attempt: number;
  delayDays: number;
  sent: boolean;
  error?: string;
  smtpMessageId?: string;
  skippedReason?: string;
};


    const results: Array<{
      leadId: string;
      email: string;
      history: FollowupHistoryItem[];
    }> = [];
    
    const allSteps: any[] = [];

    // ✅ Local queue: each (leadId, followupIndex) only ONCE per execution
    const sentFollowupThisExecution = new Set<string>();

    // Helper: build Gemini prompt for followup N
    const buildPrompt = (
      leadRow: any,
      followupIndex: number,
      subjectTemplate: string,
      bodyTemplate: string,
    ) => `
You are a world-class SDR writing short, high-conversion B2B follow-up emails.

You will receive:
- The full lead record (name, role, company, email, etc.)
- The sending company's configuration (name, description, Calendly URL, etc.)
- A followup index (1 = first followup, 2 = second, etc.)
- A SUBJECT TEMPLATE and BODY TEMPLATE that describe the tone + structure desired.

Your job:
1. Understand the lead, their role, and company context.
2. Understand the sending company's value proposition from templateConfig.
3. Use the subjectTemplate and bodyTemplate as STYLE + STRUCTURE hints (not literal text).
4. Generate a final follow-up email as strict JSON with this exact shape:

{
  "lead_name": "The lead's name here",
  "body": "Multi-line follow-up email here",
  "calendly_link": "https://calendly.com/your-company/15min-demo",
  "client_name": "The company you're sending from",
  "subject": "Quick follow-up on my earlier note"
}

Rules:
- All 5 keys MUST be present: lead_name, body, calendly_link, client_name, subject.
- Values must all be strings.



Rules:
- No salutations like "Hi [Name]," in body.
- Keep the subject concise and personalized.
- Keep the body short, concrete, and non-spammy.
- Reference earlier outreach lightly (it's a follow-up).
- Include a single clear CTA, ideally using the Calendly URL if present.
- Do NOT include comments.
- Do NOT wrap the JSON in backticks or code fences.
- Do NOT add extra fields.

--------------------
FOLLOWUP NUMBER:
${followupIndex}

LEAD:
${JSON.stringify(leadRow, null, 2)}

TEMPLATE CONFIG (SENDER COMPANY):
${JSON.stringify(templateConfig, null, 2)}

SUBJECT TEMPLATE (STYLE HINT):
${subjectTemplate}

BODY TEMPLATE (STYLE HINT):
${bodyTemplate}


Return ONLY valid JSON with exactly these 5 keys:
"lead_name", "body", "calendly_link", "client_name", "subject".".
`;

    // --- PROCESS EACH LEAD ------------------------------------------
    for (const leadItem of leadArray) {
      const leadId = leadItem.leadId || leadItem.id;
      if (!leadId) continue;

      const dbLead = await prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (!dbLead || !dbLead.email) {
        results.push({
          leadId,
          email: dbLead?.email ?? "",
          history: [],
        });
        continue;
      }

      const email = dbLead.email.toLowerCase().trim();
      if (!email) {
        results.push({
          leadId: dbLead.id,
          email: "",
          history: [],
        });
        continue;
      }

      const history: FollowupHistoryItem[] = [];

      // One lead → multiple followups in sequence (per execution)
      for (let i = 0; i < compiledFollowups.length; i++) {
        const idx = i + 1;
        const cfgF = compiledFollowups[i];
        const queueKey = `${leadId}-${idx}`;

        // ✅ Rule: local queue – avoid duplicates inside THIS execution
        if (sentFollowupThisExecution.has(queueKey)) {
          history.push({
            attempt: idx,
            delayDays: 0,
            sent: false,
            skippedReason:
              "Followup already sent to this lead in this execution; skipped duplicate.",
          });
          continue;
        }

        sentFollowupThisExecution.add(queueKey);

        // For testing: treat daysOffset as MINUTES
                // Interpret daysOffset as real DAYS between followups
        const delayDays = cfgF.delayDays ?? 0;
        if (delayDays > 0) {
          await step.sleep(
            `followup-wait-${dbLead.id}-${idx}`,
            `${delayDays} days`,
          );
        }


        const prompt = buildPrompt(
          dbLead,
          idx,
          cfgF.rawSubjectTemplate,
          cfgF.rawBodyTemplate,
        );

        // --- Gemini: generate subject + body ------------------------
        const { steps: geminiSteps } = await step.ai.wrap(
          `followup-gemini-generate-${dbLead.id}-${idx}`,
          generateText,
          {
            model: google("gemini-2.0-flash"),
            prompt,
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

        // Default to Handlebars-rendered templates
        // Default to Handlebars-rendered templates
let subject = cfgF.subjectFn({
  lead: dbLead,
  templateConfig,
  followupNumber: idx,
});
let body = cfgF.bodyFn({
  lead: dbLead,
  templateConfig,
  followupNumber: idx,
});

let templateData = {
  lead_name: (dbLead as any).name ?? (dbLead as any).fullName ?? dbLead.email,
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
  // If JSON parsing fails, keep Handlebars-based defaults in templateData
}

subject = templateData.subject;
body = templateData.body;


        // ✅ Idempotent send per (leadId, followupIndex, execution) using step.run
        const sendKey = `followup-send-${dbLead.id}-${idx}`;
        const sendResult = await step.run(sendKey, async () => {
          let sent = false;
          let smtpMessageId: string | undefined;
          let error: string | undefined;

          try {
            const res = await fetch("https://api.smtp2go.com/v3/email/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              
body: JSON.stringify({
  api_key: smtpApiKey,
  sender: fromEmail,
  to: [email],
  template_id: "7548901",
  template_data: templateData,
  // optional: for logs
  subject: templateData.subject,
  text_body: templateData.body,
}),

            });

            const json = (await res.json()) as any;
            const succeeded = json?.data?.succeeded ?? 0;
            sent = succeeded > 0;
            smtpMessageId = json?.data?.messages?.[0]?.message_id;

            if (!sent) {
              error =
                json?.data?.error ??
                json?.error ??
                "SMTP2GO followup send failed";
            }
          } catch (e: any) {
            sent = false;
            error = e?.message || "Failed to call SMTP2GO for followup";
          }

          // Analytics only – not used for gating
          await prisma.lead.update({
            where: { id: dbLead.id },
            data: {
              followupsSent: sent ? { increment: 1 } : undefined,
              lastActivityAt: new Date(),
            },
          });

          return { sent, smtpMessageId, error };
        });

               history.push({
          attempt: idx,
          delayDays,
          sent: sendResult.sent,
          error: sendResult.error,
          smtpMessageId: sendResult.smtpMessageId,
        });

      }

      results.push({
        leadId: dbLead.id,
        email,
        history,
      });
    }

    // --- WRITE RESULTS BACK INTO CONTEXT -----------------------------
    let next = setByPath(context, inputPath, results);
    if (variableName !== inputPath) {
      next = setByPath(next, variableName, results);
    }
    
    // Include steps for token tracking
    next = { ...next, steps: allSteps };
    
    // Clean up to avoid context pollution
    delete (next as any).agentTokens;

    await publish(
      leadFollowupsChannel().status({
        nodeId,
        status: "success",
        message: `Scheduled & sent followups for ${results.length} lead(s)`,
      }),
    );

    return next;
  } catch (error) {
    await publish(
      leadFollowupsChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
