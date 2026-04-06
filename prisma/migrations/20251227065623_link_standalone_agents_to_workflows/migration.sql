/*
  Warnings:

  - A unique constraint covering the columns `[workflowId]` on the table `StandaloneAgent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "StandaloneAgent" ADD COLUMN     "workflowId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "StandaloneAgent_workflowId_key" ON "StandaloneAgent"("workflowId");

-- CreateIndex
CREATE INDEX "StandaloneAgent_workflowId_idx" ON "StandaloneAgent"("workflowId");

-- AddForeignKey
ALTER TABLE "StandaloneAgent" ADD CONSTRAINT "StandaloneAgent_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
