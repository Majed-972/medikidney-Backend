import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { deleteStoredUploadIfExists } from 'src/common/file-upload.util';
import { PrismaService } from 'src/prisma/PrismaService';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateMedicalTestDto } from './dto/create-medical-test.dto';
import { FilterMedicalTestsDto } from './dto/filter-medical-tests.dto';

@Injectable()
export class MedicalTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: number, dto: CreateMedicalTestDto) {
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

    if (dto.lab_specialist_id) {
      const labSpecialist = await this.prisma.labSpecialist.findUnique({
        where: { lab_id: dto.lab_specialist_id },
      });

      if (!labSpecialist) {
        throw new NotFoundException('Laboratory specialist not present');
      }
    }

    return this.prisma.medicalTest.create({
      data: {
        patient_id: dto.patient_id,
        doctor_id: doctor.doctor_id,
        lab_specialist_id: dto.lab_specialist_id ?? null,
        test_type: dto.test_type.trim(),
        description: dto.description?.trim() || null,
        result: null,
        date_requested: new Date(),
      },
      include: {
        patient: {
          select: { patient_id: true, full_name: true },
        },
        doctor: {
          select: { doctor_id: true, full_name: true },
        },
        lab_specialist: {
          select: { lab_id: true, full_name: true },
        },
      },
    });
  }

  async complete(requesterUserId: number, testId: number, resultPath: string) {
    const labSpecialist = await this.prisma.labSpecialist.findUnique({
      where: { user_id: requesterUserId },
      select: { lab_id: true },
    });

    if (!labSpecialist) {
      throw new NotFoundException('Laboratory specialist not present');
    }

    const existingTest = await this.prisma.medicalTest.findUnique({
      where: { test_id: testId },
      select: {
        test_id: true,
        lab_specialist_id: true,
        result: true,
      },
    });

    if (!existingTest) {
      throw new NotFoundException(
        'The laboratory test request is not available',
      );
    }

    if (
      existingTest.lab_specialist_id &&
      existingTest.lab_specialist_id !== labSpecialist.lab_id
    ) {
      throw new ForbiddenException(
        'This request is assigned to another laboratory specialist',
      );
    }

    const trimmedResult = resultPath.trim();

    if (!trimmedResult) {
      throw new BadRequestException(
        'The examination result file must be attached before sending',
      );
    }

    const updatedTest = await this.prisma.medicalTest.update({
      where: { test_id: testId },
      data: {
        lab_specialist_id: labSpecialist.lab_id,
        result: trimmedResult,
        date_completed: new Date(),
        seen: false,
      },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
        lab_specialist: { select: { lab_id: true, full_name: true } },
      },
    });

    if (existingTest.result !== trimmedResult) {
      await deleteStoredUploadIfExists(existingTest.result);
    }

    // ✨ Send notification to the patient
    await this.notificationsService.sendNotificationToPatient(
      updatedTest.patient_id,
      '📋 New examination result',
      `The ${updatedTest.test_type} test result was uploaded by the laboratory specialist`,
      'TEST_RESULT',
      testId,
    );

    return updatedTest;
  }

  async markSeen(requesterUserId: number, testId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: requesterUserId },
      select: { doctor_id: true },
    });

    if (!doctor) {
      throw new NotFoundException('The doctor is not present');
    }

    const existingTest = await this.prisma.medicalTest.findUnique({
      where: { test_id: testId },
      select: {
        doctor_id: true,
        result: true,
        date_completed: true,
      },
    });

    if (!existingTest) {
      throw new NotFoundException(
        'The laboratory test request is not available',
      );
    }

    if (!existingTest.result?.trim() || !existingTest.date_completed) {
      throw new BadRequestException(
        'There is no completed result to mark as read',
      );
    }

    return this.prisma.medicalTest.update({
      where: { test_id: testId },
      data: { seen: true },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
        lab_specialist: { select: { lab_id: true, full_name: true } },
      },
    });
  }

  async getResultPathForRequest(userId: number, role: Role, testId: number) {
    const existingTest = await this.prisma.medicalTest.findUnique({
      where: { test_id: testId },
      select: {
        test_id: true,
        doctor_id: true,
        patient_id: true,
        lab_specialist_id: true,
        result: true,
      },
    });

    if (!existingTest) {
      throw new NotFoundException(
        'The laboratory test request is not available',
      );
    }

    if (!existingTest.result?.trim()) {
      throw new BadRequestException(
        'There is no result file uploaded for this test yet',
      );
    }

    if (role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { user_id: userId },
        select: { doctor_id: true },
      });

      if (!doctor) {
        throw new ForbiddenException(
          'You cannot open a test result that does not belong to you',
        );
      }
    } else if (role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { user_id: userId },
        select: { patient_id: true },
      });

      if (!patient || patient.patient_id !== existingTest.patient_id) {
        throw new ForbiddenException(
          "You cannot open another patient's test result",
        );
      }
    } else if (role === Role.LAB_TECH) {
      const labSpecialist = await this.prisma.labSpecialist.findUnique({
        where: { user_id: userId },
        select: { lab_id: true },
      });

      if (
        !labSpecialist ||
        (existingTest.lab_specialist_id !== null &&
          existingTest.lab_specialist_id !== labSpecialist.lab_id)
      ) {
        throw new ForbiddenException(
          'You cannot open a test result that does not belong to you',
        );
      }
    }

    return existingTest.result;
  }

  async findAllForRequest(
    userId: number,
    role: Role,
    filters: FilterMedicalTestsDto,
  ) {
    if (role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { user_id: userId },
      });

      if (!doctor) {
        throw new NotFoundException('The doctor is not present');
      }

      return this.prisma.medicalTest.findMany({
        where: filters.patientId
          ? { patient_id: filters.patientId }
          : { doctor_id: doctor.doctor_id },
        include: {
          patient: { select: { patient_id: true, full_name: true } },
          lab_specialist: { select: { lab_id: true, full_name: true } },
        },
        orderBy: [{ date_requested: 'desc' }, { test_id: 'desc' }],
      });
    }

    if (role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { user_id: userId },
      });

      if (!patient) {
        throw new NotFoundException('The patient is not present');
      }

      return this.prisma.medicalTest.findMany({
        where: { patient_id: patient.patient_id },
        include: {
          doctor: { select: { doctor_id: true, full_name: true } },
          lab_specialist: { select: { lab_id: true, full_name: true } },
        },
        orderBy: [{ date_requested: 'desc' }, { test_id: 'desc' }],
      });
    }

    if (role === Role.LAB_TECH) {
      const labSpecialist = await this.prisma.labSpecialist.findUnique({
        where: { user_id: userId },
      });

      if (!labSpecialist) {
        throw new NotFoundException('Laboratory specialist not present');
      }

      return this.prisma.medicalTest.findMany({
        where: {
          OR: [
            { lab_specialist_id: null },
            { lab_specialist_id: labSpecialist.lab_id },
          ],
          ...(filters.patientId ? { patient_id: filters.patientId } : {}),
        },
        include: {
          patient: { select: { patient_id: true, full_name: true } },
          doctor: { select: { doctor_id: true, full_name: true } },
        },
        orderBy: [{ date_requested: 'desc' }, { test_id: 'desc' }],
      });
    }

    return this.prisma.medicalTest.findMany({
      where: filters.patientId ? { patient_id: filters.patientId } : undefined,
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
        lab_specialist: { select: { lab_id: true, full_name: true } },
      },
      orderBy: [{ date_requested: 'desc' }, { test_id: 'desc' }],
    });
  }
}
