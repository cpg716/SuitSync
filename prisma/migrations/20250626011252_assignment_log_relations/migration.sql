-- CreateTable
CREATE TABLE "AssignmentLog" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "oldTailorId" INTEGER,
    "newTailorId" INTEGER,
    "userId" INTEGER,
    "method" TEXT NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssignmentLog_jobId_idx" ON "AssignmentLog"("jobId");

-- CreateIndex
CREATE INDEX "AssignmentLog_partId_idx" ON "AssignmentLog"("partId");

-- CreateIndex
CREATE INDEX "AssignmentLog_userId_idx" ON "AssignmentLog"("userId");

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AlterationJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_partId_fkey" FOREIGN KEY ("partId") REFERENCES "AlterationJobPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentLog" ADD CONSTRAINT "AssignmentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
