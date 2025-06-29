/*
  Warnings:

  - You are about to drop the column `skillLevel` on the `TailorAbility` table. All the data in the column will be lost.
  - You are about to drop the column `isAvailable` on the `TailorSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `TailorSchedule` table. All the data in the column will be lost.
  - Added the required column `proficiency` to the `TailorAbility` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TailorAbility" DROP COLUMN "skillLevel",
ADD COLUMN     "proficiency" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "TailorSchedule" DROP COLUMN "isAvailable",
DROP COLUMN "notes",
ALTER COLUMN "startTime" SET DATA TYPE TEXT,
ALTER COLUMN "endTime" SET DATA TYPE TEXT;
