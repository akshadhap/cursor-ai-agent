import { NonRetriableError } from "inngest";
import prisma from "@/lib/db";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

import type { NodeExecutor } from "@/features/executions/types";
import { leadQualifierChannel } from "@/inngest/channels/lead-qualifier";

type LeadQualifierConfig = {
  minimumScore?: number;
  inputPath?: string;
  outputPath?: string;
};

type LeadQualifierNodeData = {
  config?: LeadQualifierConfig;
};

type QualifierResult = {
  leadId: string;
  score: number;
  status: "QUALIFIED" | "NOT_QUALIFIED";
};

function getByPath(obj: any, path?: string): any {
  if (!path) return undefined;
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function setByPath(obj: any, path: string, value: any) {
  const result = { ...obj };
  const parts = path.split(".");
  let cursor = result;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!cursor[parts[i]]) cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }

  cursor[parts[parts.length - 1]] = value;
  return result;
}

export const qualifierExecutor: NodeExecutor<LeadQualifierNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    leadQualifierChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const cfg = data?.config ?? {};

    const minimumScore = cfg.minimumScore ?? 70;
    const inputPath = cfg.inputPath || "leads";
    const outputPath = cfg.outputPath || "leads";

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new NonRetriableError(
        "Gemini API key missing. Add GOOGLE_GENERATIVE_AI_API_KEY to env."
      );
    }

    const google = createGoogleGenerativeAI({ apiKey });

    // Read leads from context
    const leads = getByPath(context, inputPath);

    if (!Array.isArray(leads) || leads.length === 0) {
      return context;
    }

    const results: QualifierResult[] = [];

const buildPrompt = (lead: any) => `
You are an expert B2B lead qualification and scoring analyst specializing in SaaS, sales automation, and enterprise solution fit.

Your task is to evaluate the quality of the following lead and assign a final score STRICTLY between 0 and 100.

---------------------------------------------------
🎯 SCORING FRAMEWORK (Apply ALL Criteria)
---------------------------------------------------

Score the lead based on the **10 major qualification dimensions** below.  
Each dimension includes **examples, positive signals, negative signals**, and **weight**.

1) **Budget Fit (Weight: 20%)**
   - Higher score → budget aligns with realistic cost expectations.
   - + Strong: budget is high or flexible.
   - – Weak: very low budget, unclear budget.

2) **Company Size & Buying Power (Weight: 15%)**
   - Larger companies or funded startups → higher buying ability.
   - + Strong: >50 employees, clear spending capability.
   - – Weak: <5 employees unless high intent.

3) **Role & Decision-Making Authority (Weight: 15%)**
   - Seniority matters (Founder, CTO, Director, Manager).
   - + Strong: decision-maker or influencer.
   - – Weak: interns, junior roles (unless high urgency).

4) **Project Urgency (Weight: 15%)**
   - Urgency indicates buying intent.
   - + Strong: “urgent”, “immediate”, “ASAP”.
   - – Weak: “just exploring”, “no timeline”.

5) **Lead Source Quality (Weight: 10%)**
   - Some sources have higher intent (LinkedIn, website form).
   - + Strong: inbound website/form, referral, LinkedIn.
   - – Weak: cold list, unknown, random source.

6) **Company Fit & Use Case Alignment (Weight: 10%)**
   - Does this lead match an ideal customer profile?
   - + Strong: B2B, SaaS, sales teams, operations.
   - – Weak: irrelevant industry with no alignment.

7) **Contact Information Completeness (Weight: 5%)**
   - + Strong: email + phone + company + name provided.
   - – Weak: missing key details.

8) **Engagement Quality (Weight: 5%)**
   - If available: did they reply, show interest?
   - If unknown → neutral (do not punish).

9) **Likelihood to Convert (Weight: 3%)**
   - Based on all fields, estimate close potential.

10) **Noise Check (Weight: 2%)**
   - Penalize fake names, invalid emails, joke entries.

---------------------------------------------------
🎯 FINAL EXPECTATION
---------------------------------------------------
Combine all weighted criteria into a SINGLE final score between 0 and 100.

The score MUST:
- Be a whole number (integer)
- Have **no extra text**
- Not include "%" or explanation
- Not include reasoning
- Not include formatting

---------------------------------------------------
LEAD DATA TO SCORE:
${JSON.stringify(lead, null, 2)}

---------------------------------------------------
📌 FINAL INSTRUCTION
Respond with ONLY the number.
Do NOT include words, labels, or explanations.
`;


    const allSteps: any[] = [];

       for (const lead of leads) {
      const prompt = buildPrompt(lead);

      // Use the same pattern as geminiExecutor: steps[] → parts[] → text
      const { steps } = await step.ai.wrap(
        "qualify-lead",
        generateText,
        {
          model: google("gemini-2.0-flash"),
          prompt,
        },
      );
      
      // Collect steps for token tracking
      if (steps && Array.isArray(steps)) {
        allSteps.push(...steps);
      }

      let rawText = "";

      const firstStep = steps?.[0];
      if (firstStep?.content) {
        for (const part of firstStep.content) {
          if (part.type === "text") {
            rawText += part.text;
          }
        }
      }

      rawText = rawText.trim();

      // Fall back to "0" if somehow nothing comes back
      const numeric = parseInt(rawText || "0", 10);
      const score = Math.min(100, Math.max(0, Number.isNaN(numeric) ? 0 : numeric));

      const status: "QUALIFIED" | "NOT_QUALIFIED" =
        score >= minimumScore ? "QUALIFIED" : "NOT_QUALIFIED";

      results.push({
        leadId: lead.leadId!,
        score,
        status,
      });

      // update DB
      await prisma.lead.update({
        where: { id: lead.leadId },
        data: {
          score,
          status,
          lastActivityAt: new Date(),
        },
      });
    }


    // Write clean results to context
        // 👇 This step is JUST for Inngest UI "Step Output" view
    await step.run("qualifier-output", async () => {
      return {
        leads: results,
      };
    });

    // Write results back into the execution context
    const nextContext = {
      ...context,
      [outputPath]: results, // usually "leads"
      steps: allSteps, // Include steps for token tracking
    };
    
    // Clean up to avoid context pollution
    delete (nextContext as any).agentTokens;

    await publish(
      leadQualifierChannel().status({
        nodeId,
        status: "success",
        message: `Qualified ${results.length} lead(s)`,
      }),
    );

    return nextContext;

  } catch (err) {
    await publish(
      leadQualifierChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw err;
  }
};
