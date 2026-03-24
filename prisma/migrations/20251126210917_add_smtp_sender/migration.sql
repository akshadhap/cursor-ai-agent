-- CreateEnum
CREATE TYPE "SmtpSenderStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateTable
CREATE TABLE "SmtpSender" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "SmtpSenderStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "SmtpSender_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmtpSender_email_key" ON "SmtpSender"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SmtpSender_token_key" ON "SmtpSender"("token");
