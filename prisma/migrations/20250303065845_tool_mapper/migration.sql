/*
  Warnings:

  - You are about to drop the `MapCache` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "MapCache";

-- CreateTable
CREATE TABLE "ToolMapper" (
    "tool" TEXT NOT NULL,
    "queryParams" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolMapper_pkey" PRIMARY KEY ("tool")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolMapper_tool_key" ON "ToolMapper"("tool");
