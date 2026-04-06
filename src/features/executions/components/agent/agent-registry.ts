import { AgentType } from "@/generated/prisma";
import { ingestionExecutor } from "./ingestion/executor";
import { qualifierExecutor } from "./qualifier/executor";
import { prioritizerExecutor } from "./prioritizer/executor";
import { outreachExecutor } from "./outreach/executor";
import { followupsExecutor } from "./followups/executor";

export const agentRegistry = {
  [AgentType.LEAD_INGESTION]: ingestionExecutor,
  [AgentType.LEAD_QUALIFIER]: qualifierExecutor,
  [AgentType.LEAD_PRIORITIZER]: prioritizerExecutor,
  [AgentType.LEAD_COLD_OUTREACH]: outreachExecutor,
  [AgentType.LEAD_FOLLOWUP]: followupsExecutor,
};
