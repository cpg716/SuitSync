/*
  Warnings:

  - A unique constraint covering the columns `[lightspeedEmployeeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "User_lightspeedEmployeeId_key" ON "User"("lightspeedEmployeeId");
