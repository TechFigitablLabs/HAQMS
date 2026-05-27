/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doctorId,tokenNumber,createdAt]` on the table `QueueToken` will be added. If there are existing duplicate values, this will fail.
  - Made the column `consultationFee` on table `Doctor` required. This step will fail if there are existing NULL values in that column.
  - Made the column `experience` on table `Doctor` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Doctor" ALTER COLUMN "consultationFee" SET NOT NULL,
ALTER COLUMN "experience" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");

-- CreateIndex
CREATE INDEX "Doctor_specialization_idx" ON "Doctor"("specialization");

-- CreateIndex
CREATE INDEX "Doctor_department_idx" ON "Doctor"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_phoneNumber_key" ON "Patient"("phoneNumber");

-- CreateIndex
CREATE INDEX "Patient_name_idx" ON "Patient"("name");

-- CreateIndex
CREATE INDEX "Patient_gender_idx" ON "Patient"("gender");

-- CreateIndex
CREATE UNIQUE INDEX "QueueToken_doctorId_tokenNumber_createdAt_key" ON "QueueToken"("doctorId", "tokenNumber", "createdAt");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
