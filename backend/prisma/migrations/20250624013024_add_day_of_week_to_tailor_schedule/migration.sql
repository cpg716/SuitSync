/*
  Warnings:

  - Added the required column `dayOfWeek` to the `TailorSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TailorSchedule" ADD COLUMN     "dayOfWeek" INTEGER NOT NULL;
