// src/features/executions/components/agent/ingestion/executor.ts
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { leadIngestionChannel } from "@/inngest/channels/lead-ingestion";
import prisma from "@/lib/db";

type SourceType = "WEBFORM" | "EXCEL" | "CRM";

type LeadIngestionConfig = {
  variableName?: string; // e.g. "leads"
  source?: SourceType;   // WEBFORM | EXCEL | CRM
  inputPath?: string;    // where raw leads live in context
  outputPath?: string;   // where normalized leads should be written

  fullName?: string;
  email?: string;
  companyName?: string;
  phoneNumber?: string;
  role?: string;
  budgetRange?: string;
  companySize?: string;
  projectUrgency?: string;
  leadSource?: string;

  excelRows?: any[];
};

type LeadIngestionNodeData = {
  agentType?: string;
  config?: LeadIngestionConfig;
  description?: string;
  label?: string;
};

export type NormalizedLead = {
  fullName: string;
  email: string;
  companyName?: string;
  phoneNumber?: string;
  role?: string;
  budgetRange?: string;
  companySize?: string;
  projectUrgency?: string;
  leadSource?: string;
  leadId?: string;
  raw?: unknown;
};

// -------- dot-path helpers --------
function getByPath(obj: any, path?: string): any {
  if (!path) return undefined;
  const parts = path.split(".");
  return parts.reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function setByPath(obj: any, path: string, value: unknown): any {
  const parts = path.split(".");
  if (!parts.length) return obj;

  const clone: any = { ...obj };
  let cursor: any = clone;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[parts[parts.length - 1]] = value;
  return clone;
}

// -------- tolerant field lookup --------
function getField(obj: any, candidates: string[]): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;

  const normalizedEntries = Object.entries(obj).reduce<Record<string, any>>(
    (acc, [key, value]) => {
      const normKey = key.toLowerCase().replace(/\s+/g, "").replace(/_/g, "");
      acc[normKey] = value;
      return acc;
    },
    {},
  );

  for (const candidate of candidates) {
    const normCandidate = candidate
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/_/g, "");
    if (normCandidate in normalizedEntries) {
      const v = normalizedEntries[normCandidate];
      if (v == null) return undefined;
      return typeof v === "string" ? v : String(v);
    }
  }

  return undefined;
}

function normalizeLead(raw: any, source?: SourceType): NormalizedLead {
  const fullName =
    getField(raw, ["fullName", "full_name", "name", "contactName", "leadName"]) ||
    "";
  const email =
    getField(raw, ["email", "emailAddress", "email_address"]) || "";

  const companyName = getField(raw, ["companyName", "company", "accountName"]);
  const phoneNumber = getField(raw, ["phoneNumber", "phone", "mobile"]);
  const role = getField(raw, ["role", "title", "jobTitle"]);
  const budgetRange = getField(raw, ["budgetRange", "budget"]);
  const companySize = getField(raw, ["companySize", "employeeCount", "size"]);
  const projectUrgency = getField(raw, ["projectUrgency", "urgency"]);
  const leadSource = getField(raw, ["leadSource", "source", "channel"]);

  return {
    fullName,
    email,
    companyName,
    phoneNumber,
    role,
    budgetRange,
    companySize,
    projectUrgency,
    leadSource,
  };
}

export const ingestionExecutor: NodeExecutor<LeadIngestionNodeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    leadIngestionChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    // 👀 still keep debug so you can verify shapes
    await step.run("debug-ingestion-input", async () => {
      return {
        dataSnapshot: data,
        contextSnapshot: context,
      };
    });

    const nextContext = await step.run("lead-ingestion", async () => {
      // 🔴 IMPORTANT: everything is under data.config
      const cfg: LeadIngestionConfig = data?.config ?? {};

      const variableName = cfg.variableName || "leads";
      const inputPath = cfg.inputPath || "leads";
      const outputPath = cfg.outputPath || "leads";
      const source = cfg.source as SourceType | undefined;

      if (!inputPath) {
        throw new NonRetriableError(
          "Lead ingestion node: inputPath is required in config",
        );
      }

      if (!outputPath) {
        throw new NonRetriableError(
          "Lead ingestion node: outputPath is required in config",
        );
      }

      // 1️⃣ Try to read raw leads from context (Excel/CRM/webhook)
      // 1️⃣ First: Excel rows from node.config (UI upload)
let items: any[] | null = null;

if (Array.isArray(cfg.excelRows) && cfg.excelRows.length > 0) {
  // Excel mode → use parsed rows directly
  items = cfg.excelRows;
} else {
  // 2️⃣ Otherwise: try reading from context (CRM/Webhook/etc.)
  const raw = getByPath(context, inputPath);

  if (Array.isArray(raw)) {
    items = raw;
  } else if (raw && typeof raw === "object") {
    items = [raw];
  }
}


      // 2️⃣ If no raw leads and WEBFORM, use config as a single lead
      // 2️⃣ If no raw leads and WEBFORM, use config as a single lead
if (!items || items.length === 0) {
  if (source === "WEBFORM") {
    const fallback = {
      fullName: cfg.fullName,
      email: cfg.email,
      companyName: cfg.companyName,
      phoneNumber: cfg.phoneNumber,
      role: cfg.role,
      budgetRange: cfg.budgetRange,
      companySize: cfg.companySize,
      projectUrgency: cfg.projectUrgency,
      leadSource: cfg.leadSource,
    };

    if (!fallback.email && !fallback.fullName) {
      return context;
    }

    items = [fallback];
  } else {
    return context;
  }
}


      // 3️⃣ Normalize
      const normalizedBase: NormalizedLead[] = items.map((item) =>
        normalizeLead(item, source),
      );

      // 4️⃣ Find workflowId from nodeId
      const node = await prisma.node.findUnique({
        where: { id: nodeId },
        select: { workflowId: true },
      });

      if (!node) {
        throw new NonRetriableError(
          `Lead ingestion node: node ${nodeId} not found in database`,
        );
      }

      const workflowId = node.workflowId;

      // 5️⃣ Save leads to DB
      const createdLeads = await Promise.all(
        normalizedBase.map((lead) =>
          prisma.lead.create({
            data: {
              workflowId,
              name: lead.fullName || "Unnamed lead",
              email: lead.email,
              company: lead.companyName ?? null,
              score: 0,
              status: "IN_REVIEW",
              emailStatus: "NOT_SENT",
              followupsSent: 0,
              lastActivityAt: new Date(),
              source: (source ?? "WEBFORM") as any,
              raw: lead as any,
            },
          }),
        ),
      );

      // 6️⃣ Attach leadId back
      const normalized: NormalizedLead[] = normalizedBase.map(
        (lead, index) => ({
          ...lead,
          leadId: createdLeads[index].id,
        }),
      );

      // 7️⃣ Write into context for downstream nodes
      let updatedContext = setByPath(context, outputPath, normalized);

      if (variableName && variableName !== outputPath) {
        updatedContext = setByPath(updatedContext, variableName, normalized);
      }

      return updatedContext;
    });

    await publish(
      leadIngestionChannel().status({
        nodeId,
        status: "success",
      }),
    );

    // For agent cost tracking, add a base token cost for non-LLM processing
    // This represents the agent's computational/processing cost
    const result = {
      ...nextContext,
      agentTokens: 500, // Base cost for ingestion agent processing
    };
    
    // Clean up to avoid context pollution
    delete (result as any).steps;
    
    return result;
  } catch (error) {
    await publish(
      leadIngestionChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
