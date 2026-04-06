-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('QUALIFIED', 'NOT_QUALIFIED', 'IN_REVIEW');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('NOT_SENT', 'SENT', 'DELIVERED', 'OPENED', 'BOUNCED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBFORM', 'EXCEL', 'CRM');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "status" "LeadStatus" NOT NULL DEFAULT 'IN_REVIEW',
    "emailStatus" "EmailStatus" NOT NULL DEFAULT 'NOT_SENT',
    "followupsSent" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "source" "LeadSource" NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_workflowId_idx" ON "Lead"("workflowId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
