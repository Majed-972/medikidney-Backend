import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateMedicationDto } from '../dto/create-medication.dto';
import { DialysisSessionAccessService } from './dialysis-session-access.service';

@Injectable()
export class SessionMedicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionAccess: DialysisSessionAccessService,
  ) {}

  async recordMedication(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    dto: CreateMedicationDto,
  ) {
    const session = await this.sessionAccess.getWritableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    const nurseId = await this.sessionAccess.resolveRecorderNurseId(
      requesterUserId,
      requesterRole,
      session.nurse_id,
    );

    return this.prisma.sessionMedication.create({
      data: {
        session_id: sessionId,
        administered_by_nurse_id: nurseId,
        medication_name: dto.medicationName,
        dosage: dto.dosage,
        unit: dto.unit,
        notes: dto.notes,
      },
      include: {
        nurse: { select: { nurse_id: true, full_name: true } },
        session: { select: { session_id: true, patient_id: true } },
      },
    });
  }

  async getSessionMedications(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    await this.sessionAccess.getReadableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    return this.prisma.sessionMedication.findMany({
      where: { session_id: sessionId },
      include: {
        nurse: { select: { nurse_id: true, full_name: true } },
      },
      orderBy: { administered_at: 'asc' },
    });
  }

  async deleteMedication(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    medicationId: number,
  ) {
    if (requesterRole === Role.PATIENT) {
      throw new ForbiddenException(
        'The patient cannot delete medication records.',
      );
    }

    await this.sessionAccess.getWritableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    const medication = await this.prisma.sessionMedication.findFirst({
      where: {
        med_id: medicationId,
        session_id: sessionId,
      },
      select: { med_id: true },
    });

    if (!medication) {
      throw new NotFoundException(
        'The medication record is not present within this session.',
      );
    }

    return this.prisma.sessionMedication.delete({
      where: { med_id: medicationId },
    });
  }
}
