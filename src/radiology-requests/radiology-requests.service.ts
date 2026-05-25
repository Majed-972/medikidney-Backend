import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RadiologyRequestStatus, Role } from '@prisma/client';
import { deleteStoredUploadIfExists } from 'src/common/file-upload.util';
import { PrismaService } from 'src/prisma/PrismaService';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateRadiologyRequestDto } from './dto/create-radiology-request.dto';
import { FilterRadiologyRequestsDto } from './dto/filter-radiology-requests.dto';

@Injectable()
export class RadiologyRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(requesterUserId: number, dto: CreateRadiologyRequestDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { patient_id: dto.patient_id },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: requesterUserId },
      select: { doctor_id: true },
    });

    if (!doctor) {
      throw new ForbiddenException(
        'This process is only available to doctors.',
      );
    }

    return this.prisma.radiologyImage.create({
      data: {
        patient_id: dto.patient_id,
        doctor_id: doctor.doctor_id,
        image_type: dto.image_type.trim(),
        description: dto.description?.trim() || null,
        image_path: null,
        status: RadiologyRequestStatus.PENDING,
        radiologist_id: null,
      },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
        radiologist: { select: { rad_id: true, full_name: true } },
      },
    });
  }

  async completeRequest(
    requesterUserId: number,
    imageId: number,
    imagePath: string,
    description?: string,
  ) {
    const radiologist = await this.prisma.radiologist.findUnique({
      where: { user_id: requesterUserId },
      select: { rad_id: true },
    });

    if (!radiologist) {
      throw new ForbiddenException(
        'This process is only available to radiologists.',
      );
    }

    const existingRequest = await this.prisma.radiologyImage.findUnique({
      where: { image_id: imageId },
      select: {
        image_id: true,
        image_path: true,
      },
    });

    if (!existingRequest) {
      throw new NotFoundException('X-ray request not found');
    }

    const trimmedImagePath = imagePath.trim();

    if (!trimmedImagePath) {
      throw new BadRequestException(
        'The radiology result file must be uploaded before completing the application.',
      );
    }

    const updatedRequest = await this.prisma.radiologyImage.update({
      where: { image_id: imageId },
      data: {
        radiologist_id: radiologist.rad_id,
        image_path: trimmedImagePath,
        description:
          description !== undefined ? description.trim() || null : undefined,
        status: RadiologyRequestStatus.COMPLETED,
        completed_at: new Date(),
        seen: false,
      },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
        radiologist: { select: { rad_id: true, full_name: true } },
      },
    });

    if (existingRequest.image_path !== trimmedImagePath) {
      await deleteStoredUploadIfExists(existingRequest.image_path);
    }

    // ✨ Send notification to the patient
    await this.notificationsService.sendNotificationToPatient(
      updatedRequest.patient_id,
      '🖼️ New x-ray',
      `The x-ray image ${updatedRequest.image_type} was uploaded by a radiologist`,
      'RADIOLOGY',
      imageId,
    );

    return updatedRequest;
  }

  async markSeen(requesterUserId: number, imageId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: requesterUserId },
      select: { doctor_id: true },
    });

    if (!doctor) {
      throw new NotFoundException('The doctor is not present');
    }

    const existingRequest = await this.prisma.radiologyImage.findUnique({
      where: { image_id: imageId },
      select: {
        doctor_id: true,
        status: true,
        image_path: true,
      },
    });

    if (!existingRequest) {
      throw new NotFoundException('X-ray request not found');
    }

    if (
      existingRequest.status !== RadiologyRequestStatus.COMPLETED ||
      !existingRequest.image_path?.trim()
    ) {
      throw new BadRequestException(
        'There is no completed x-ray result to mark as read',
      );
    }

    return this.prisma.radiologyImage.update({
      where: { image_id: imageId },
      data: {
        seen: true,
      },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
        radiologist: { select: { rad_id: true, full_name: true } },
      },
    });
  }

  async getImagePathForRequest(userId: number, role: Role, imageId: number) {
    const existingRequest = await this.prisma.radiologyImage.findUnique({
      where: { image_id: imageId },
      select: {
        image_id: true,
        patient_id: true,
        doctor_id: true,
        radiologist_id: true,
        image_path: true,
      },
    });

    if (!existingRequest) {
      throw new NotFoundException('X-ray request not found');
    }

    if (!existingRequest.image_path?.trim()) {
      throw new BadRequestException(
        'There is no result file uploaded for this request yet',
      );
    }

    if (role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { user_id: userId },
        select: { doctor_id: true },
      });

      if (!doctor) {
        throw new ForbiddenException(
          'You cannot open an X-ray result that does not belong to you',
        );
      }
    } else if (role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { user_id: userId },
        select: { patient_id: true },
      });

      if (!patient || patient.patient_id !== existingRequest.patient_id) {
        throw new ForbiddenException(
          "You cannot open another patient's x-ray result",
        );
      }
    } else if (role === Role.RADIOLOGIST) {
      const radiologist = await this.prisma.radiologist.findUnique({
        where: { user_id: userId },
        select: { rad_id: true },
      });

      if (
        !radiologist ||
        (existingRequest.radiologist_id !== null &&
          existingRequest.radiologist_id !== radiologist.rad_id)
      ) {
        throw new ForbiddenException(
          'You cannot open an X-ray result that does not belong to you',
        );
      }
    }

    return existingRequest.image_path;
  }

  async findAllForRequest(
    userId: number,
    role: Role,
    filters: FilterRadiologyRequestsDto,
  ) {
    if (role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { user_id: userId },
      });

      if (!patient) {
        throw new NotFoundException('The patient is not present');
      }

      return this.prisma.radiologyImage.findMany({
        where: { patient_id: patient.patient_id },
        include: {
          doctor: { select: { doctor_id: true, full_name: true } },
          radiologist: { select: { rad_id: true, full_name: true } },
        },
        orderBy: [{ created_at: 'desc' }, { image_id: 'desc' }],
      });
    }

    if (role === Role.RADIOLOGIST) {
      const radiologist = await this.prisma.radiologist.findUnique({
        where: { user_id: userId },
      });

      if (!radiologist) {
        throw new NotFoundException('The radiologist is not present');
      }

      return this.prisma.radiologyImage.findMany({
        where: {
          OR: [
            { radiologist_id: null },
            { radiologist_id: radiologist.rad_id },
          ],
          ...(filters.patientId ? { patient_id: filters.patientId } : {}),
        },
        include: {
          patient: { select: { patient_id: true, full_name: true } },
          doctor: { select: { doctor_id: true, full_name: true } },
          radiologist: { select: { rad_id: true, full_name: true } },
        },
        orderBy: [{ created_at: 'desc' }, { image_id: 'desc' }],
      });
    }

    if (role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { user_id: userId },
        select: { doctor_id: true },
      });

      if (!doctor) {
        throw new NotFoundException('The doctor is not present');
      }

      return this.prisma.radiologyImage.findMany({
        where: filters.patientId
          ? { patient_id: filters.patientId }
          : { doctor_id: doctor.doctor_id },
        include: {
          patient: { select: { patient_id: true, full_name: true } },
          doctor: { select: { doctor_id: true, full_name: true } },
          radiologist: { select: { rad_id: true, full_name: true } },
        },
        orderBy: [{ created_at: 'desc' }, { image_id: 'desc' }],
      });
    }

    return this.prisma.radiologyImage.findMany({
      where: filters.patientId ? { patient_id: filters.patientId } : undefined,
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
        radiologist: { select: { rad_id: true, full_name: true } },
      },
      orderBy: [{ created_at: 'desc' }, { image_id: 'desc' }],
    });
  }
}
