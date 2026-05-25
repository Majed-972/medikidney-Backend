import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { FilterPrescriptionsDto } from './dto/filter-prescriptions.dto';
import { UpdatePrescriptionDispenseDto } from './dto/update-prescription-dispense.dto';

@Injectable()
export class PrescriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: number, dto: CreatePrescriptionDto) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
    });

    if (!doctor) {
      throw new NotFoundException('The doctor is not present');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { patient_id: dto.patient_id },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    if (dto.pharmacist_id) {
      const pharmacist = await this.prisma.pharmacist.findUnique({
        where: { pharmacist_id: dto.pharmacist_id },
      });

      if (!pharmacist) {
        throw new NotFoundException('The pharmacist is not present');
      }
    }

    const prescription = await this.prisma.prescription.create({
      data: {
        doctor_id: doctor.doctor_id,
        patient_id: dto.patient_id,
        pharmacist_id: dto.pharmacist_id ?? null,
        details: {
          create: dto.items.map((item) => ({
            drug_name: item.drug_name.trim(),
            instructions: item.instructions?.trim() || null,
          })),
        },
      },
      include: {
        patient: {
          select: { patient_id: true, full_name: true },
        },
        doctor: {
          select: { doctor_id: true, full_name: true },
        },
        pharmacist: {
          select: { pharmacist_id: true, full_name: true },
        },
        details: true,
      },
    });

    return this.withDispenseStatus(prescription);
  }

  async delete(userId: number, prescriptionId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
      select: { doctor_id: true },
    });

    if (!doctor) {
      throw new NotFoundException('The doctor is not present');
    }

    const prescription = await this.prisma.prescription.findUnique({
      where: { prescription_id: prescriptionId },
      select: {
        prescription_id: true,
        doctor_id: true,
        details: {
          select: {
            drug_id: true,
            status: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Recipe not found');
    }

    if (prescription.doctor_id !== doctor.doctor_id) {
      throw new ForbiddenException(
        'You cannot delete a recipe that does not belong to you',
      );
    }

    if (prescription.details.some((detail) => detail.status)) {
      throw new BadRequestException(
        'It is not possible to delete a prescription that has already been dispensed from the pharmacy',
      );
    }

    await this.prisma.$transaction([
      this.prisma.drugDetail.deleteMany({
        where: { prescription_id: prescriptionId },
      }),
      this.prisma.prescription.delete({
        where: { prescription_id: prescriptionId },
      }),
    ]);

    return { success: true };
  }

  async markDispensed(
    userId: number,
    prescriptionId: number,
    dto: UpdatePrescriptionDispenseDto,
  ) {
    const pharmacist = await this.prisma.pharmacist.findUnique({
      where: { user_id: userId },
      select: { pharmacist_id: true },
    });

    if (!pharmacist) {
      throw new NotFoundException('The pharmacist is not present');
    }

    const prescription = await this.loadPrescriptionById(prescriptionId);

    if (!prescription) {
      throw new NotFoundException('Recipe not found');
    }

    if (
      prescription.pharmacist?.pharmacist_id &&
      prescription.pharmacist.pharmacist_id !== pharmacist.pharmacist_id
    ) {
      throw new ForbiddenException(
        'This prescription is assigned to another pharmacist',
      );
    }

    const validDrugIds = new Set(
      prescription.details.map((detail) => detail.drug_id),
    );
    const invalidDrugId = dto.drug_ids.find(
      (drugId) => !validDrugIds.has(drugId),
    );

    if (invalidDrugId) {
      throw new BadRequestException(
        'There is a medicine that does not belong to this prescription',
      );
    }

    const transactionOperations: any[] = [
      this.prisma.prescription.update({
        where: { prescription_id: prescriptionId },
        data: { pharmacist_id: pharmacist.pharmacist_id },
      }),
    ];

    if (dto.drug_ids.length > 0) {
      transactionOperations.push(
        this.prisma.drugDetail.updateMany({
          where: {
            prescription_id: prescriptionId,
            drug_id: { in: dto.drug_ids },
          },
          data: {
            status: true,
          },
        }),
      );
    }

    await this.prisma.$transaction(transactionOperations);

    const updatedPrescription = await this.loadPrescriptionById(prescriptionId);

    if (!updatedPrescription) {
      throw new NotFoundException('Recipe not found after update');
    }

    // ✨ Send notification to the patient
    await this.notificationsService.sendNotificationToPatient(
      updatedPrescription.patient_id,
      '💊 Medications ready to be dispensed',
      'Your medications have been dispensed from the pharmacy',
      'PRESCRIPTION',
      prescriptionId,
    );

    return this.withDispenseStatus(updatedPrescription);
  }

  async findAllForRequest(
    userId: number,
    role: Role,
    filters: FilterPrescriptionsDto,
  ) {
    if (role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { user_id: userId },
      });

      if (!doctor) {
        throw new NotFoundException('The doctor is not present');
      }

      const prescriptions = await this.prisma.prescription.findMany({
        where: {
          doctor_id: doctor.doctor_id,
          ...(filters.patientId ? { patient_id: filters.patientId } : {}),
        },
        include: {
          patient: {
            select: { patient_id: true, full_name: true },
          },
          doctor: {
            select: { doctor_id: true, full_name: true },
          },
          pharmacist: {
            select: { pharmacist_id: true, full_name: true },
          },
          details: true,
        },
        orderBy: [{ date_prescribed: 'desc' }, { prescription_id: 'desc' }],
      });

      return prescriptions.map((prescription) =>
        this.withDispenseStatus(prescription),
      );
    }

    if (role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { user_id: userId },
      });

      if (!patient) {
        throw new NotFoundException('The patient is not present');
      }

      const prescriptions = await this.prisma.prescription.findMany({
        where: { patient_id: patient.patient_id },
        include: {
          doctor: {
            select: { doctor_id: true, full_name: true },
          },
          pharmacist: {
            select: { pharmacist_id: true, full_name: true },
          },
          details: true,
        },
        orderBy: [{ date_prescribed: 'desc' }, { prescription_id: 'desc' }],
      });

      return prescriptions.map((prescription) =>
        this.withDispenseStatus(prescription),
      );
    }

    if (role === Role.PHARMACIST) {
      const pharmacist = await this.prisma.pharmacist.findUnique({
        where: { user_id: userId },
      });

      if (!pharmacist) {
        throw new NotFoundException('The pharmacist is not present');
      }

      const prescriptions = await this.prisma.prescription.findMany({
        where: {
          OR: [
            { pharmacist_id: pharmacist.pharmacist_id },
            { pharmacist_id: null },
          ],
          ...(filters.patientId ? { patient_id: filters.patientId } : {}),
        },
        include: {
          patient: {
            select: { patient_id: true, full_name: true },
          },
          doctor: {
            select: { doctor_id: true, full_name: true },
          },
          pharmacist: {
            select: { pharmacist_id: true, full_name: true },
          },
          details: true,
        },
        orderBy: [{ date_prescribed: 'desc' }, { prescription_id: 'desc' }],
      });

      return prescriptions.map((prescription) =>
        this.withDispenseStatus(prescription),
      );
    }

    const prescriptions = await this.prisma.prescription.findMany({
      where: filters.patientId ? { patient_id: filters.patientId } : undefined,
      include: {
        patient: {
          select: { patient_id: true, full_name: true },
        },
        doctor: {
          select: { doctor_id: true, full_name: true },
        },
        pharmacist: {
          select: { pharmacist_id: true, full_name: true },
        },
        details: true,
      },
      orderBy: [{ date_prescribed: 'desc' }, { prescription_id: 'desc' }],
    });

    return prescriptions.map((prescription) =>
      this.withDispenseStatus(prescription),
    );
  }

  private withDispenseStatus<
    T extends { details: { status: boolean }[]; pharmacist_id?: number | null },
  >(prescription: T) {
    const totalCount = prescription.details.length;
    const dispensedCount = prescription.details.filter(
      (detail) => detail.status,
    ).length;

    let dispense_status: 'NOT_DISPENSED' | 'IN_PROGRESS' | 'DISPENSED' =
      'NOT_DISPENSED';

    if (
      prescription.pharmacist_id !== null &&
      prescription.pharmacist_id !== undefined
    ) {
      dispense_status = 'DISPENSED';
    } else {
      dispense_status = 'NOT_DISPENSED';
    }

    return {
      ...prescription,
      dispense_status,
      dispensed_count: dispensedCount,
      pending_count: totalCount - dispensedCount,
      total_count: totalCount,
    };
  }

  private loadPrescriptionById(prescriptionId: number) {
    return this.prisma.prescription.findUnique({
      where: { prescription_id: prescriptionId },
      include: {
        patient: {
          select: { patient_id: true, full_name: true },
        },
        doctor: {
          select: { doctor_id: true, full_name: true },
        },
        pharmacist: {
          select: { pharmacist_id: true, full_name: true },
        },
        details: true,
      },
    });
  }
}
