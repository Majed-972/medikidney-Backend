/*
  Warnings:

  - You are about to drop the `FollowUpSession` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FollowUpSession" DROP CONSTRAINT "FollowUpSession_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "FollowUpSession" DROP CONSTRAINT "FollowUpSession_patient_id_fkey";

-- DropTable
DROP TABLE "FollowUpSession";
