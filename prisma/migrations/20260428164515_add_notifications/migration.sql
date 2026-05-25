/*
  Warnings:

  - You are about to drop the column `status` on the `DialysisSchedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "DialysisSession" DROP CONSTRAINT "DialysisSession_schedule_id_fkey";

-- AlterTable
ALTER TABLE "DialysisSchedule" DROP COLUMN "status";

-- DropEnum
DROP TYPE "DialysisScheduleStatus";

-- CreateTable
CREATE TABLE "PatientDeviceToken" (
    "token_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "device_token" TEXT NOT NULL,
    "device_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientDeviceToken_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "notification_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "notification_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "related_id" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientDeviceToken_device_token_key" ON "PatientDeviceToken"("device_token");

-- CreateIndex
CREATE INDEX "PatientDeviceToken_patient_id_idx" ON "PatientDeviceToken"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "PatientDeviceToken_patient_id_device_token_key" ON "PatientDeviceToken"("patient_id", "device_token");

-- CreateIndex
CREATE INDEX "NotificationLog_patient_id_idx" ON "NotificationLog"("patient_id");

-- CreateIndex
CREATE INDEX "NotificationLog_is_read_idx" ON "NotificationLog"("is_read");

-- CreateIndex
CREATE INDEX "NotificationLog_created_at_idx" ON "NotificationLog"("created_at");

-- AddForeignKey
ALTER TABLE "DialysisSession" ADD CONSTRAINT "DialysisSession_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "DialysisSchedule"("schedule_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDeviceToken" ADD CONSTRAINT "PatientDeviceToken_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;
