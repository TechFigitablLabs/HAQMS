/*
  Warnings:

  - The `availableFrom` column on the `Doctor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `availableTo` column on the `Doctor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[doctorId,appointmentDate]` on the table `Appointment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[doctorId,tokenNumber,queueDate]` on the table `QueueToken` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Doctor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `gender` on the `Patient` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `QueueToken` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Doctor" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "availableFrom",
ADD COLUMN     "availableFrom" INTEGER NOT NULL DEFAULT 540,
DROP COLUMN "availableTo",
ADD COLUMN     "availableTo" INTEGER NOT NULL DEFAULT 1020;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "gender",
ADD COLUMN     "gender" "Gender" NOT NULL;

-- AlterTable
ALTER TABLE "QueueToken" ADD COLUMN     "queueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Appointment_doctorId_status_idx" ON "Appointment"("doctorId", "status");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_doctorId_appointmentDate_key" ON "Appointment"("doctorId", "appointmentDate");

-- CreateIndex
CREATE INDEX "Doctor_department_idx" ON "Doctor"("department");

-- CreateIndex
CREATE INDEX "Doctor_specialization_idx" ON "Doctor"("specialization");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_phoneNumber_key" ON "Patient"("phoneNumber");

-- CreateIndex
CREATE INDEX "QueueToken_doctorId_queueDate_idx" ON "QueueToken"("doctorId", "queueDate");

-- CreateIndex
CREATE INDEX "QueueToken_status_idx" ON "QueueToken"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QueueToken_doctorId_tokenNumber_queueDate_key" ON "QueueToken"("doctorId", "tokenNumber", "queueDate");
