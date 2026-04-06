/*
  Warnings:

  - You are about to drop the column `leads` on the `StandaloneAgent` table. All the data in the column will be lost.
  - You are about to drop the column `workflowId` on the `StandaloneAgent` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,type]` on the table `StandaloneAgent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialType" ADD VALUE 'ZOOM';
ALTER TYPE "CredentialType" ADD VALUE 'ZOHO_CRM';
ALTER TYPE "CredentialType" ADD VALUE 'AIRTABLE';
ALTER TYPE "CredentialType" ADD VALUE 'INTERCOM';
ALTER TYPE "CredentialType" ADD VALUE 'GOOGLE_SHEETS';
ALTER TYPE "CredentialType" ADD VALUE 'GOOGLE_CALENDAR';
ALTER TYPE "CredentialType" ADD VALUE 'JIRA';
ALTER TYPE "CredentialType" ADD VALUE 'TELEGRAM';
ALTER TYPE "CredentialType" ADD VALUE 'PINECONE';
ALTER TYPE "CredentialType" ADD VALUE 'AIRBNB';
ALTER TYPE "CredentialType" ADD VALUE 'EXPEDIA';
ALTER TYPE "CredentialType" ADD VALUE 'RAZORPAY';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'ZOOM';
ALTER TYPE "NodeType" ADD VALUE 'ZOHO_CRM';
ALTER TYPE "NodeType" ADD VALUE 'AIRTABLE';
ALTER TYPE "NodeType" ADD VALUE 'INTERCOM';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_SHEETS';
ALTER TYPE "NodeType" ADD VALUE 'GOOGLE_CALENDAR';
ALTER TYPE "NodeType" ADD VALUE 'CRON_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'HUBSPOT_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'JIRA';
ALTER TYPE "NodeType" ADD VALUE 'TELEGRAM';
ALTER TYPE "NodeType" ADD VALUE 'PINECONE';
ALTER TYPE "NodeType" ADD VALUE 'MCP_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'TELEGRAM_TRIGGER';
ALTER TYPE "NodeType" ADD VALUE 'AIRBNB';
ALTER TYPE "NodeType" ADD VALUE 'EXPEDIA';
ALTER TYPE "NodeType" ADD VALUE 'RAZORPAY';

-- DropForeignKey
ALTER TABLE "Execution" DROP CONSTRAINT "Execution_workflowId_fkey";

-- DropForeignKey
ALTER TABLE "StandaloneAgent" DROP CONSTRAINT "StandaloneAgent_workflowId_fkey";

-- DropIndex
DROP INDEX "StandaloneAgent_status_idx";

-- DropIndex
DROP INDEX "StandaloneAgent_workflowId_idx";

-- DropIndex
DROP INDEX "StandaloneAgent_workflowId_key";

-- AlterTable
ALTER TABLE "AIConversationMessage" ADD COLUMN     "sequence" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Execution" ADD COLUMN     "executedNodes" JSONB,
ADD COLUMN     "plannedNodes" JSONB,
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "workflowName" TEXT,
ALTER COLUMN "workflowId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "StandaloneAgent" DROP COLUMN "leads",
DROP COLUMN "workflowId",
ADD COLUMN     "data" JSONB,
ALTER COLUMN "config" SET DEFAULT '{}';

-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "conversationMetadata" JSONB;

-- CreateIndex
CREATE INDEX "AIConversationMessage_workflowId_sequence_idx" ON "AIConversationMessage"("workflowId", "sequence");

-- CreateIndex
CREATE INDEX "StandaloneAgent_type_idx" ON "StandaloneAgent"("type");

-- CreateIndex
CREATE UNIQUE INDEX "StandaloneAgent_userId_type_key" ON "StandaloneAgent"("userId", "type");

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
