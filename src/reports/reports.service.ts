import { Injectable, NotFoundException } from '@nestjs/common';
import { RadiologyRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/PrismaService';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      doctors,
      nurses,
      patients,
      pharmacists,
      labTechs,
      nutritionists,
      radiologists,
    ] = await Promise.all([
      this.prisma.doctor.count(),
      this.prisma.nurse.count(),
      this.prisma.patient.count(),
      this.prisma.pharmacist.count(),
      this.prisma.labSpecialist.count(),
      this.prisma.nutritionist.count(),
      this.prisma.radiologist.count(),
    ]);

    return {
      doctors,
      nurses,
      patients,
      pharmacists,
      labTechs,
      nutritionists,
      radiologists,
    };
  }

  async getDoctors(search?: string) {
    return this.prisma.doctor.findMany({
      where: search
        ? { full_name: { contains: search, mode: 'insensitive' } }
        : {},
      include: { user: { select: { canAccess: true, user_id: true } } },
    });
  }

  async getBookingDoctors(search?: string) {
    const doctors = await this.prisma.doctor.findMany({
      where: {
        user: {
          canAccess: true,
        },
        isHead: false,
        ...(search
          ? {
              OR: [
                { full_name: { contains: search, mode: 'insensitive' } },
                { specialty: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        doctor_id: true,
        full_name: true,
        specialty: true,
        doctorSchedules: {
          where: { is_active: true },
          select: {
            weekday: true,
            start_time: true,
            end_time: true,
          },
          orderBy: { weekday: 'asc' },
        },
      },
      orderBy: { full_name: 'asc' },
    });

    return doctors.map((doctor) => ({
      doctor_id: doctor.doctor_id,
      full_name: doctor.full_name,
      specialty: doctor.specialty,
      has_active_schedule: doctor.doctorSchedules.length > 0,
      active_schedule_days_count: doctor.doctorSchedules.length,
      active_schedule_days: doctor.doctorSchedules.map((schedule) => ({
        weekday: schedule.weekday,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      })),
    }));
  }

  async getNurses(search?: string) {
    return this.prisma.nurse.findMany({
      where: search
        ? { full_name: { contains: search, mode: 'insensitive' } }
        : {},
      include: { user: { select: { canAccess: true, user_id: true } } },
    });
  }

  async getPatients(userId: number, search?: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
      select: { doctor_id: true },
    });

    if (!doctor) {
      throw new NotFoundException('The doctor is not present');
    }

    const patients = await this.prisma.patient.findMany({
      where: search
        ? { full_name: { contains: search, mode: 'insensitive' } }
        : {},
      select: {
        patient_id: true,
        full_name: true,
        phone: true,
        blood_type: true,
        national_id: true,
        user: { select: { user_id: true } },
      },
      orderBy: { full_name: 'asc' },
    });

    const patientIds = patients.map((patient) => patient.patient_id);

    if (patientIds.length === 0) {
      return patients.map((patient) => ({
        ...patient,
        unread_medical_results_count: 0,
        unread_radiology_results_count: 0,
        unread_results_count: 0,
        has_unread_results: false,
      }));
    }

    const [medicalRows, radiologyRows] = await Promise.all([
      this.prisma.medicalTest.findMany({
        where: {
          patient_id: { in: patientIds },
          doctor_id: doctor.doctor_id,
          seen: false,
          date_completed: { not: null },
        },
        select: {
          patient_id: true,
          result: true,
        },
      }),
      this.prisma.radiologyImage.findMany({
        where: {
          patient_id: { in: patientIds },
          doctor_id: doctor.doctor_id,
          seen: false,
          status: RadiologyRequestStatus.COMPLETED,
        },
        select: {
          patient_id: true,
          image_path: true,
        },
      }),
    ]);

    const unreadMedicalCounts = medicalRows.reduce<Record<number, number>>(
      (acc, row) => {
        if (!row.result?.trim()) {
          return acc;
        }

        acc[row.patient_id] = (acc[row.patient_id] || 0) + 1;
        return acc;
      },
      {},
    );

    const unreadRadiologyCounts = radiologyRows.reduce<Record<number, number>>(
      (acc, row) => {
        if (!row.image_path?.trim()) {
          return acc;
        }

        acc[row.patient_id] = (acc[row.patient_id] || 0) + 1;
        return acc;
      },
      {},
    );

    return patients.map((patient) => {
      const unreadMedicalResultsCount =
        unreadMedicalCounts[patient.patient_id] || 0;
      const unreadRadiologyResultsCount =
        unreadRadiologyCounts[patient.patient_id] || 0;
      const unreadResultsCount =
        unreadMedicalResultsCount + unreadRadiologyResultsCount;

      return {
        ...patient,
        unread_medical_results_count: unreadMedicalResultsCount,
        unread_radiology_results_count: unreadRadiologyResultsCount,
        unread_results_count: unreadResultsCount,
        has_unread_results: unreadResultsCount > 0,
      };
    });
  }

  async getPharmacists(search?: string) {
    return this.prisma.pharmacist.findMany({
      where: search
        ? { full_name: { contains: search, mode: 'insensitive' } }
        : {},
      include: { user: { select: { canAccess: true, user_id: true } } },
    });
  }

  async getLabSpecialists(search?: string) {
    return this.prisma.labSpecialist.findMany({
      where: search
        ? { full_name: { contains: search, mode: 'insensitive' } }
        : {},
      include: { user: { select: { canAccess: true, user_id: true } } },
    });
  }

  async getNutritionists(search?: string) {
    return this.prisma.nutritionist.findMany({
      where: search
        ? { full_name: { contains: search, mode: 'insensitive' } }
        : {},
      include: { user: { select: { canAccess: true, user_id: true } } },
    });
  }

  async getRadiologists(search?: string) {
    return this.prisma.radiologist.findMany({
      where: search
        ? { full_name: { contains: search, mode: 'insensitive' } }
        : {},
      include: { user: { select: { canAccess: true, user_id: true } } },
    });
  }
}
