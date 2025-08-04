-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ALTERATION', 'BUTTON_WORK', 'MEASUREMENT', 'CUSTOM');

-- AlterTable
ALTER TABLE "AlterationTask" ALTER COLUMN "taskType" TYPE "TaskType" USING "taskType"::"TaskType";
ALTER TABLE "AlterationTask" ALTER COLUMN "taskType" SET DEFAULT 'ALTERATION'; 