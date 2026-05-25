/*
  Warnings:

  - Added the required column `updated_at` to the `DialysisSession` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SymptomType" AS ENUM ('LOW_BP', 'CRAMPS', 'NAUSEA', 'HEADACHE', 'CHEST_PAIN', 'ITCHING', 'DIZZINESS', 'MUSCLE_PAIN', 'OTHER');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- AlterTable
ALTER TABLE "DialysisSession" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "SessionVitalSigns" (
    "vital_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "recorded_by_nurse_id" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "pulse" INTEGER,
    "temperature" DOUBLE PRECISION,
    "oxygen_saturation" INTEGER,

    CONSTRAINT "SessionVitalSigns_pkey" PRIMARY KEY ("vital_id")
);

-- CreateTable
CREATE TABLE "SessionMedication" (
    "med_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "administered_by_nurse_id" INTEGER NOT NULL,
    "medication_name" TEXT NOT NULL,
    "dosage" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "administered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "SessionMedication_pkey" PRIMARY KEY ("med_id")
);

-- CreateTable
CREATE TABLE "SessionDialysisSettings" (
    "setting_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "recorded_by_nurse_id" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blood_flow_rate" INTEGER,
    "dialysate_flow" INTEGER,
    "ultrafiltration_rate" DOUBLE PRECISION,

    CONSTRAINT "SessionDialysisSettings_pkey" PRIMARY KEY ("setting_id")
);

-- CreateTable
CREATE TABLE "SessionSymptom" (
    "symptom_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "symptom_type" "SymptomType" NOT NULL,
    "severity" "SeverityLevel" NOT NULL DEFAULT 'MILD',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "SessionSymptom_pkey" PRIMARY KEY ("symptom_id")
);

-- CreateIndex
CREATE INDEX "SessionVitalSigns_session_id_idx" ON "SessionVitalSigns"("session_id");

-- CreateIndex
CREATE INDEX "SessionVitalSigns_recorded_at_idx" ON "SessionVitalSigns"("recorded_at");

-- CreateIndex
CREATE INDEX "SessionMedication_session_id_idx" ON "SessionMedication"("session_id");

-- CreateIndex
CREATE INDEX "SessionMedication_administered_at_idx" ON "SessionMedication"("administered_at");

-- CreateIndex
CREATE INDEX "SessionDialysisSettings_session_id_idx" ON "SessionDialysisSettings"("session_id");

-- CreateIndex
CREATE INDEX "SessionDialysisSettings_recorded_at_idx" ON "SessionDialysisSettings"("recorded_at");

-- CreateIndex
CREATE INDEX "SessionSymptom_session_id_idx" ON "SessionSymptom"("session_id");

-- CreateIndex
CREATE INDEX "SessionSymptom_occurred_at_idx" ON "SessionSymptom"("occurred_at");

-- AddForeignKey
ALTER TABLE "SessionVitalSigns" ADD CONSTRAINT "SessionVitalSigns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DialysisSession"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionVitalSigns" ADD CONSTRAINT "SessionVitalSigns_recorded_by_nurse_id_fkey" FOREIGN KEY ("recorded_by_nurse_id") REFERENCES "Nurse"("nurse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMedication" ADD CONSTRAINT "SessionMedication_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DialysisSession"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMedication" ADD CONSTRAINT "SessionMedication_administered_by_nurse_id_fkey" FOREIGN KEY ("administered_by_nurse_id") REFERENCES "Nurse"("nurse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionDialysisSettings" ADD CONSTRAINT "SessionDialysisSettings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DialysisSession"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionDialysisSettings" ADD CONSTRAINT "SessionDialysisSettings_recorded_by_nurse_id_fkey" FOREIGN KEY ("recorded_by_nurse_id") REFERENCES "Nurse"("nurse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSymptom" ADD CONSTRAINT "SessionSymptom_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "DialysisSession"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
