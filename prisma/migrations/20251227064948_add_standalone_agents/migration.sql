-- CreateTable
CREATE TABLE "StandaloneAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "StandaloneAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StandaloneAgent_userId_idx" ON "StandaloneAgent"("userId");

-- CreateIndex
CREATE INDEX "StandaloneAgent_status_idx" ON "StandaloneAgent"("status");

-- AddForeignKey
ALTER TABLE "StandaloneAgent" ADD CONSTRAINT "StandaloneAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
