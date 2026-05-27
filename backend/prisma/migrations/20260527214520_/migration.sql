/*
  Warnings:

  - The primary key for the `Appointment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `status` column on the `Appointment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Doctor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Doctor` table. All the data in the column will be lost.
  - You are about to alter the column `consultationFee` on the `Doctor` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The primary key for the `Patient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `Patient` table. All the data in the column will be lost.
  - The primary key for the `QueueToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `status` column on the `QueueToken` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[phoneNumber]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "QueueToken" DROP CONSTRAINT "QueueToken_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "QueueToken" DROP CONSTRAINT "QueueToken_patientId_fkey";

-- DropIndex
DROP INDEX "Doctor_name_idx";

-- DropIndex
DROP INDEX "Patient_phoneNumber_idx";

-- DropIndex
DROP INDEX "QueueToken_doctorId_idx";

-- DropIndex
DROP INDEX "QueueToken_status_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "patientId" SET DATA TYPE TEXT,
ALTER COLUMN "doctorId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Appointment_id_seq";

-- AlterTable
ALTER TABLE "Doctor" DROP CONSTRAINT "Doctor_pkey",
DROP COLUMN "createdAt",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "department" DROP NOT NULL,
ALTER COLUMN "consultationFee" SET DEFAULT 0,
ALTER COLUMN "consultationFee" SET DATA TYPE INTEGER,
ALTER COLUMN "experience" SET DEFAULT 0,
ADD CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Doctor_id_seq";

-- AlterTable
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_pkey",
DROP COLUMN "createdAt",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Patient_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Patient_id_seq";

-- AlterTable
ALTER TABLE "QueueToken" DROP CONSTRAINT "QueueToken_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'WAITING',
ALTER COLUMN "patientId" SET DATA TYPE TEXT,
ALTER COLUMN "doctorId" SET DATA TYPE TEXT,
ALTER COLUMN "appointmentId" SET DATA TYPE TEXT,
ADD CONSTRAINT "QueueToken_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "QueueToken_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "createdAt",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'RECEPTIONIST',
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- DropEnum
DROP TYPE "AppointmentStatus";

-- DropEnum
DROP TYPE "QueueStatus";

-- DropEnum
DROP TYPE "Role";

-- CreateIndex
CREATE INDEX "Appointment_doctorId_appointmentDate_idx" ON "Appointment"("doctorId", "appointmentDate");

-- CreateIndex
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");

-- CreateIndex
CREATE INDEX "Doctor_department_idx" ON "Doctor"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_phoneNumber_key" ON "Patient"("phoneNumber");

-- CreateIndex
CREATE INDEX "Patient_gender_idx" ON "Patient"("gender");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
