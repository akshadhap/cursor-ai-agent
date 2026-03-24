-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable
CREATE TABLE "AIConversationThread" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Conversation',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AIConversationThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversationMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIConversationThread_workflowId_idx" ON "AIConversationThread"("workflowId");

-- CreateIndex
CREATE INDEX "AIConversationThread_workflowId_isActive_idx" ON "AIConversationThread"("workflowId", "isActive");

-- CreateIndex
CREATE INDEX "AIConversationMessage_threadId_idx" ON "AIConversationMessage"("threadId");

-- CreateIndex
CREATE INDEX "AIConversationMessage_threadId_createdAt_idx" ON "AIConversationMessage"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "AIConversationThread" ADD CONSTRAINT "AIConversationThread_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversationMessage" ADD CONSTRAINT "AIConversationMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AIConversationThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
