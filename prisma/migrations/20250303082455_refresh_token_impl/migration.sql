-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "refreshToken" TEXT,
ADD COLUMN     "secretExpiresAt" TIMESTAMP(3);
