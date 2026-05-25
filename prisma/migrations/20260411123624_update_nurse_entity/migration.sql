-- CreateTable
CREATE TABLE "ScheduleAssignment" (
    "assignment_id" SERIAL NOT NULL,
    "schedule_id" INTEGER NOT NULL,
    "nurse_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleAssignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleAssignment_schedule_id_date_key" ON "ScheduleAssignment"("schedule_id", "date");

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "DialysisSchedule"("schedule_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleAssignment" ADD CONSTRAINT "ScheduleAssignment_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "Nurse"("nurse_id") ON DELETE CASCADE ON UPDATE CASCADE;
