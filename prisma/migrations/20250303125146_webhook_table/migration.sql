-- CreateTable
CREATE TABLE "Webhook" (
    "toolName" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "webhookId" TEXT,
    "secret" TEXT,

    CONSTRAINT "Webhook_pkey" PRIMARY KEY ("toolName","ownerId")
);
