-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('LEAD_INGESTION', 'LEAD_QUALIFIER', 'LEAD_PRIORITIZER', 'LEAD_COLD_OUTREACH', 'LEAD_FOLLOWUP');

-- AlterEnum
ALTER TYPE "NodeType" ADD VALUE 'AGENT';

-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "agentType" "AgentType";

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "isDeveloper" BOOLEAN NOT NULL DEFAULT true;
