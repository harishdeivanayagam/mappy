-- CreateTable
CREATE TABLE "MapCache" (
    "id" TEXT NOT NULL,
    "inputSchema" TEXT NOT NULL,
    "targetSchema" TEXT NOT NULL,
    "mapper" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapCache_pkey" PRIMARY KEY ("id")
);
