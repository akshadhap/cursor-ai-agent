/*
  Warnings:

  - You are about to drop the column `threadId` on the `AIConversationMessage` table. All the data in the column will be lost.
  - You are about to drop the `AIConversationThread` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `workflowId` to the `AIConversationMessage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AIConversationMessage" DROP CONSTRAINT "AIConversationMessage_threadId_fkey";

-- DropForeignKey
ALTER TABLE "AIConversationThread" DROP CONSTRAINT "AIConversationThread_workflowId_fkey";

-- DropIndex
DROP INDEX "AIConversationMessage_threadId_createdAt_idx";

-- DropIndex
DROP INDEX "AIConversationMessage_threadId_idx";

-- AlterTable
ALTER TABLE "AIConversationMessage" DROP COLUMN "threadId",
ADD COLUMN     "workflowId" TEXT NOT NULL;

-- DropTable
DROP TABLE "AIConversationThread";

-- CreateIndex
CREATE INDEX "AIConversationMessage_workflowId_createdAt_idx" ON "AIConversationMessage"("workflowId", "createdAt");

-- AddForeignKey
ALTER TABLE "AIConversationMessage" ADD CONSTRAINT "AIConversationMessage_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
