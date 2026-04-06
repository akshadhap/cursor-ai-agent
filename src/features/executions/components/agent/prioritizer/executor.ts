import { NonRetriableError } from "inngest";
import prisma from "@/lib/db";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { NodeExecutor } from "@/features/executions/types";
import { leadPrioritizerChannel } from "@/inngest/channels/lead-prioritizer";

type LeadPrioritizerNodeData = {};

type QualifiedLead = {
  leadId: string;
  score: number;
  status: "QUALIFIED" | "NOT_QUALIFIED";
  [key: string]: any;
};

type PrioritizedLead = QualifiedLead & {
  priority: number;
};

type GeminiPrioritizerResponse = {
  leads: {
    leadId: string;
    priority: number;
  }[];
};

export const prioritizerExecutor: NodeExecutor<LeadPrioritizerNodeData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    leadPrioritizerChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    // 1️⃣ Read qualified leads from context.leads (output of qualifier)
    const leads = (context as any)?.leads as QualifiedLead[] | undefined;

    if (!Array.isArray(leads) || leads.length === 0) {
      // nothing to prioritize → just pass context through
      await publish(
        leadPrioritizerChannel().status({
          nodeId,
          status: "success",
          message: "No leads found to prioritize",
        }),
      );
      return context;
    }

    // 2️⃣ Gemini API key from env
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new NonRetriableError(
        "Gemini API key missing. Add GOOGLE_GENERATIVE_AI_API_KEY to env.",
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });

    // 3️⃣ Build prompt: ask for JSON { "leads": [ { "leadId", "priority" } ] }
    const prompt = `
You are an expert B2B lead prioritization engine.

You will receive a list of already qualified leads.
Each lead has: "leadId", "score" (0–100), "status" (QUALIFIED / NOT_QUALIFIED), and other metadata.

Your task:
1. Consider all available fields (score, company, source, urgency, etc.).
2. Assign each lead a "priority" where:
   - 1 = highest priority (should be contacted first)
   - Higher numbers = lower priority.
3. All priorities must be unique (no duplicates).
4. Leads with higher scores and better fit should generally get higher priority (closer to 1).

Return ONLY valid JSON in the following EXACT shape:

{
  "leads": [
    { "leadId": "string", "priority": 1 },
    { "leadId": "string", "priority": 2 }
  ]
}

- Do NOT include comments.
- Do NOT include extra fields.
- Do NOT include any text before or after the JSON.

Here is the list of qualified leads to prioritize:

${JSON.stringify(leads, null, 2)}
`;

    // 4️⃣ Call Gemini
    const { steps: geminiSteps } = await step.ai.wrap("prioritize-leads", generateText, {
      model: google("gemini-2.0-flash"),
      prompt,
      experimental_telemetry: {
        isEnabled: true,
        recordInputs: true,
        recordOutputs: true,
      },
    });

    // 5️⃣ Extract raw text
    let rawText = "";
    const firstStep = geminiSteps?.[0];
    if (firstStep?.content) {
      for (const part of firstStep.content) {
        if (part.type === "text") {
          rawText += part.text;
        }
      }
    }
    rawText = rawText.trim();

    // 6️⃣ Clean code fences if present
    let cleaned = rawText;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/, "")
        .trim();
    }

    // 7️⃣ Parse JSON safely
    let parsed: GeminiPrioritizerResponse;
    try {
      parsed = JSON.parse(cleaned) as GeminiPrioritizerResponse;
    } catch (err) {
      throw new NonRetriableError(
        `Gemini returned invalid JSON for prioritization: ${rawText}`,
      );
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.leads)
    ) {
      throw new NonRetriableError(
        "Gemini prioritization JSON missing 'leads' array.",
      );
    }

    // 8️⃣ Build prioritized list: keep score/status, attach priority
    const byId = new Map(leads.map((l) => [l.leadId, l]));
    const prioritized: PrioritizedLead[] = [];

    for (const item of parsed.leads) {
      if (!item?.leadId || typeof item.priority !== "number") continue;
      const base = byId.get(item.leadId);
      if (!base) continue;

      prioritized.push({
        ...base,
        priority: item.priority,
      });
    }

    // Fallback: if Gemini response incomplete, keep unmentioned leads at end
    const mentionedIds = new Set(prioritized.map((l) => l.leadId));
    const leftovers = leads.filter((l) => !mentionedIds.has(l.leadId));
    let maxPriority =
      prioritized.reduce(
        (max, l) => (l.priority > max ? l.priority : max),
        0,
      ) || 0;

    for (const l of leftovers) {
      maxPriority += 1;
      prioritized.push({
        ...l,
        priority: maxPriority,
      });
    }

    // Sort by priority ascending
    prioritized.sort((a, b) => a.priority - b.priority);

    // 9️⃣ (Optional) Update DB with lastActivityAt; no "priority" column in schema
       // 9️⃣ Update DB with lastActivityAt + priority
    await Promise.all(
      prioritized.map((lead) =>
        prisma.lead.update({
          where: { id: lead.leadId },
          data: {
            lastActivityAt: new Date(),
            priority: lead.priority,
            // score & status already set in qualifier; don't touch here.
          },
        }),
      ),
    );


    // 🔟 Write clean result into context as `leads`
    const nextContext = {
      ...context,
      leads: prioritized,
      steps: geminiSteps || [], // Include steps for token tracking
    };
    
    // Clean up to avoid context pollution
    delete (nextContext as any).agentTokens;

    await publish(
      leadPrioritizerChannel().status({
        nodeId,
        status: "success",
        message: `Prioritized ${prioritized.length} lead(s)`,
      }),
    );

    return nextContext;
  } catch (error) {
    await publish(
      leadPrioritizerChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
