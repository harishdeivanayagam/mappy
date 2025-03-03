/*
  Warnings:

  - The primary key for the `Webhook` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `event` to the `Webhook` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_pkey",
ADD COLUMN     "event" TEXT NOT NULL,
ADD CONSTRAINT "Webhook_pkey" PRIMARY KEY ("toolName", "ownerId", "event");
