/*
  Warnings:

  - You are about to drop the column `appointmentId` on the `SyncLog` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `SyncLog` table. All the data in the column will be lost.
  - Added the required column `recordCount` to the `SyncLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resource` to the `SyncLog` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `SyncLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "SyncLog" DROP CONSTRAINT "SyncLog_appointmentId_fkey";

-- AlterTable
ALTER TABLE "SyncLog" DROP COLUMN "appointmentId",
DROP COLUMN "payload",
ADD COLUMN     "lightspeedIds" TEXT[],
ADD COLUMN     "recordCount" INTEGER NOT NULL,
ADD COLUMN     "resource" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- DropEnum
DROP TYPE "SyncStatus";

-- CreateTable
CREATE TABLE "SyncStatus" (
    "id" SERIAL NOT NULL,
    "resource" TEXT NOT NULL,
    "lastSyncedVersion" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SyncStatus_resource_key" ON "SyncStatus"("resource");
