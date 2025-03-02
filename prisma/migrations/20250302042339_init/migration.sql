-- CreateEnum
CREATE TYPE "ToolAuthType" AS ENUM ('OAUTH2', 'APIKEY');

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "authType" "ToolAuthType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);
