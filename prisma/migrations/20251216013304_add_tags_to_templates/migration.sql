-- AlterTable
ALTER TABLE "WorkflowTemplate" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
