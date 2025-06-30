-- CreateIndex
CREATE INDEX "AlterationJob_status_idx" ON "AlterationJob"("status");

-- CreateIndex
CREATE INDEX "AlterationJob_orderStatus_idx" ON "AlterationJob"("orderStatus");

-- CreateIndex
CREATE INDEX "AlterationJob_receivedDate_idx" ON "AlterationJob"("receivedDate");

-- CreateIndex
CREATE INDEX "AlterationJob_dueDate_idx" ON "AlterationJob"("dueDate");

-- CreateIndex
CREATE INDEX "AlterationJob_createdAt_idx" ON "AlterationJob"("createdAt");

-- CreateIndex
CREATE INDEX "AlterationJob_rushOrder_idx" ON "AlterationJob"("rushOrder");

-- CreateIndex
CREATE INDEX "AlterationJob_lightspeedServiceOrderId_idx" ON "AlterationJob"("lightspeedServiceOrderId");

-- CreateIndex
CREATE INDEX "AlterationJob_status_dueDate_idx" ON "AlterationJob"("status", "dueDate");

-- CreateIndex
CREATE INDEX "AlterationJob_customerId_status_idx" ON "AlterationJob"("customerId", "status");

-- CreateIndex
CREATE INDEX "AlterationJob_tailorId_status_idx" ON "AlterationJob"("tailorId", "status");

-- CreateIndex
CREATE INDEX "Appointment_dateTime_idx" ON "Appointment"("dateTime");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_type_idx" ON "Appointment"("type");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Appointment_saleId_idx" ON "Appointment"("saleId");

-- CreateIndex
CREATE INDEX "Appointment_syncedToLightspeed_idx" ON "Appointment"("syncedToLightspeed");

-- CreateIndex
CREATE INDEX "Appointment_dateTime_status_idx" ON "Appointment"("dateTime", "status");

-- CreateIndex
CREATE INDEX "Appointment_partyId_dateTime_idx" ON "Appointment"("partyId", "dateTime");

-- CreateIndex
CREATE INDEX "Appointment_tailorId_dateTime_idx" ON "Appointment"("tailorId", "dateTime");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_updatedAt_idx" ON "Customer"("updatedAt");

-- CreateIndex
CREATE INDEX "Customer_syncedAt_idx" ON "Customer"("syncedAt");

-- CreateIndex
CREATE INDEX "Customer_createdBy_idx" ON "Customer"("createdBy");

-- CreateIndex
CREATE INDEX "Customer_lightspeedVersion_idx" ON "Customer"("lightspeedVersion");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_lightspeedEmployeeId_idx" ON "User"("lightspeedEmployeeId");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");
