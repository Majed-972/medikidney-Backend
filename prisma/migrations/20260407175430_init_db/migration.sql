-- CreateEnum
CREATE TYPE "DialysisScheduleStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DialysisSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RadiologyRequestStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('DIALYSIS', 'CLINIC_REVIEW', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DOCTOR', 'NURSE', 'PATIENT', 'PHARMACIST', 'NUTRITIONIST', 'RADIOLOGIST', 'LAB_TECH', 'ADMIN');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL,
    "canAccess" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "patient_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "national_id" VARCHAR(9) NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "email" TEXT NOT NULL,
    "emergency_contact" VARCHAR(10) NOT NULL,
    "blood_type" TEXT,
    "chronic_diseases" TEXT,
    "allergies" TEXT,
    "medical_history_notes" TEXT,
    "smoking_status" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "doctor_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "isHead" BOOLEAN NOT NULL DEFAULT false,
    "full_name" TEXT NOT NULL,
    "national_id" VARCHAR(9) NOT NULL,
    "specialty" TEXT NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("doctor_id")
);

-- CreateTable
CREATE TABLE "Nurse" (
    "nurse_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_id" VARCHAR(9) NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Nurse_pkey" PRIMARY KEY ("nurse_id")
);

-- CreateTable
CREATE TABLE "LabSpecialist" (
    "lab_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_id" VARCHAR(9) NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "LabSpecialist_pkey" PRIMARY KEY ("lab_id")
);

-- CreateTable
CREATE TABLE "Radiologist" (
    "rad_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_id" VARCHAR(9) NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Radiologist_pkey" PRIMARY KEY ("rad_id")
);

-- CreateTable
CREATE TABLE "Nutritionist" (
    "nutritionist_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_id" VARCHAR(9) NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Nutritionist_pkey" PRIMARY KEY ("nutritionist_id")
);

-- CreateTable
CREATE TABLE "Pharmacist" (
    "pharmacist_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "national_id" VARCHAR(9) NOT NULL,
    "phone" VARCHAR(10) NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Pharmacist_pkey" PRIMARY KEY ("pharmacist_id")
);

-- CreateTable
CREATE TABLE "RadiologyImage" (
    "image_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER,
    "radiologist_id" INTEGER,
    "image_path" TEXT,
    "image_type" TEXT NOT NULL,
    "description" TEXT,
    "status" "RadiologyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "RadiologyImage_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "MedicalTest" (
    "test_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "lab_specialist_id" INTEGER,
    "test_type" TEXT NOT NULL,
    "description" TEXT,
    "seen" BOOLEAN NOT NULL DEFAULT false,
    "result" TEXT,
    "date_requested" TIMESTAMP(3) NOT NULL,
    "date_completed" TIMESTAMP(3),

    CONSTRAINT "MedicalTest_pkey" PRIMARY KEY ("test_id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "prescription_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "pharmacist_id" INTEGER,
    "date_prescribed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("prescription_id")
);

-- CreateTable
CREATE TABLE "DrugDetail" (
    "drug_id" SERIAL NOT NULL,
    "prescription_id" INTEGER NOT NULL,
    "drug_name" TEXT NOT NULL,
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DrugDetail_pkey" PRIMARY KEY ("drug_id")
);

-- CreateTable
CREATE TABLE "DialysisSession" (
    "session_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "nurse_id" INTEGER NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "weight_before" DOUBLE PRECISION NOT NULL,
    "weight_after" DOUBLE PRECISION,
    "fluid_removed" DOUBLE PRECISION,
    "blood_pressure_before" TEXT,
    "blood_pressure_after" TEXT,
    "notes" TEXT,
    "status" "DialysisSessionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "DialysisSession_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "DialysisSchedule" (
    "schedule_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "created_by_doctor" INTEGER NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "status" "DialysisScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "machine_number" INTEGER NOT NULL,
    "shift_number" INTEGER NOT NULL,

    CONSTRAINT "DialysisSchedule_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "DialysisMachine" (
    "machine_number" INTEGER NOT NULL,
    "is_under_maintenance" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DialysisMachine_pkey" PRIMARY KEY ("machine_number")
);

-- CreateTable
CREATE TABLE "DoctorAppointment" (
    "appointment_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "patient_id" INTEGER,
    "appt_date" DATE NOT NULL,
    "appt_time" TIME NOT NULL,
    "is_booked" BOOLEAN NOT NULL DEFAULT false,
    "visit_reason" TEXT,
    "appointment_type" "AppointmentType" NOT NULL DEFAULT 'CLINIC_REVIEW',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "diagnosis" TEXT,
    "treatment_plan" TEXT,
    "medications" TEXT,
    "notes" TEXT,

    CONSTRAINT "DoctorAppointment_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "DoctorPatientBookingAccess" (
    "booking_access_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "consecutive_no_show_count" INTEGER NOT NULL DEFAULT 0,
    "is_booking_blocked" BOOLEAN NOT NULL DEFAULT false,
    "blocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorPatientBookingAccess_pkey" PRIMARY KEY ("booking_access_id")
);

-- CreateTable
CREATE TABLE "DoctorSchedule" (
    "schedule_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorSchedule_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "FollowUpSession" (
    "followup_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "diagnosis" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpSession_pkey" PRIMARY KEY ("followup_id")
);

-- CreateTable
CREATE TABLE "NutritionProgram" (
    "program_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "nutritionist_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "allowed_items" TEXT,
    "forbidden_items" TEXT,
    "breakfast" TEXT,
    "lunch" TEXT,
    "dinner" TEXT,
    "meal_notes" TEXT,

    CONSTRAINT "NutritionProgram_pkey" PRIMARY KEY ("program_id")
);

-- CreateTable
CREATE TABLE "passwordReset" (
    "reset_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "otp_code" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passwordReset_pkey" PRIMARY KEY ("reset_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_user_id_key" ON "Patient"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_national_id_key" ON "Patient"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_phone_key" ON "Patient"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_email_key" ON "Patient"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_user_id_key" ON "Doctor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_national_id_key" ON "Doctor"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_phone_key" ON "Doctor"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_email_key" ON "Doctor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Nurse_user_id_key" ON "Nurse"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Nurse_national_id_key" ON "Nurse"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "Nurse_phone_key" ON "Nurse"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Nurse_email_key" ON "Nurse"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LabSpecialist_user_id_key" ON "LabSpecialist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "LabSpecialist_national_id_key" ON "LabSpecialist"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "LabSpecialist_phone_key" ON "LabSpecialist"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "LabSpecialist_email_key" ON "LabSpecialist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Radiologist_user_id_key" ON "Radiologist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Radiologist_national_id_key" ON "Radiologist"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "Radiologist_phone_key" ON "Radiologist"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Radiologist_email_key" ON "Radiologist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Nutritionist_user_id_key" ON "Nutritionist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Nutritionist_national_id_key" ON "Nutritionist"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "Nutritionist_phone_key" ON "Nutritionist"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Nutritionist_email_key" ON "Nutritionist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacist_user_id_key" ON "Pharmacist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacist_national_id_key" ON "Pharmacist"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacist_email_key" ON "Pharmacist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DialysisSession_schedule_id_date_key" ON "DialysisSession"("schedule_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DialysisSchedule_patient_id_weekday_key" ON "DialysisSchedule"("patient_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "DialysisSchedule_weekday_shift_number_machine_number_key" ON "DialysisSchedule"("weekday", "shift_number", "machine_number");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorPatientBookingAccess_doctor_id_patient_id_key" ON "DoctorPatientBookingAccess"("doctor_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorSchedule_doctor_id_weekday_key" ON "DoctorSchedule"("doctor_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "passwordReset_user_id_key" ON "passwordReset"("user_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nurse" ADD CONSTRAINT "Nurse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSpecialist" ADD CONSTRAINT "LabSpecialist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Radiologist" ADD CONSTRAINT "Radiologist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nutritionist" ADD CONSTRAINT "Nutritionist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pharmacist" ADD CONSTRAINT "Pharmacist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyImage" ADD CONSTRAINT "RadiologyImage_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyImage" ADD CONSTRAINT "RadiologyImage_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadiologyImage" ADD CONSTRAINT "RadiologyImage_radiologist_id_fkey" FOREIGN KEY ("radiologist_id") REFERENCES "Radiologist"("rad_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalTest" ADD CONSTRAINT "MedicalTest_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalTest" ADD CONSTRAINT "MedicalTest_lab_specialist_id_fkey" FOREIGN KEY ("lab_specialist_id") REFERENCES "LabSpecialist"("lab_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalTest" ADD CONSTRAINT "MedicalTest_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_pharmacist_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "Pharmacist"("pharmacist_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugDetail" ADD CONSTRAINT "DrugDetail_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "Prescription"("prescription_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DialysisSession" ADD CONSTRAINT "DialysisSession_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "Nurse"("nurse_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DialysisSession" ADD CONSTRAINT "DialysisSession_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DialysisSession" ADD CONSTRAINT "DialysisSession_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "DialysisSchedule"("schedule_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DialysisSchedule" ADD CONSTRAINT "DialysisSchedule_created_by_doctor_fkey" FOREIGN KEY ("created_by_doctor") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DialysisSchedule" ADD CONSTRAINT "DialysisSchedule_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAppointment" ADD CONSTRAINT "DoctorAppointment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAppointment" ADD CONSTRAINT "DoctorAppointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientBookingAccess" ADD CONSTRAINT "DoctorPatientBookingAccess_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPatientBookingAccess" ADD CONSTRAINT "DoctorPatientBookingAccess_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSchedule" ADD CONSTRAINT "DoctorSchedule_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSession" ADD CONSTRAINT "FollowUpSession_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpSession" ADD CONSTRAINT "FollowUpSession_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionProgram" ADD CONSTRAINT "NutritionProgram_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "Nutritionist"("nutritionist_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionProgram" ADD CONSTRAINT "NutritionProgram_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passwordReset" ADD CONSTRAINT "passwordReset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
