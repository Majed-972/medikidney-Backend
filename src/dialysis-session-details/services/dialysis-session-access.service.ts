import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DialysisSessionStatus, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';

type SessionAccessRecord = {
  session_id: number;
  patient_id: number;
  nurse_id: number;
  start_time: Date;
  end_time: Date | null;
  status: DialysisSessionStatus;
};

@Injectable()
export class DialysisSessionAccessService {
  private readonly closedStatuses: DialysisSessionStatus[] = [
    DialysisSessionStatus.COMPLETED,
    DialysisSessionStatus.CANCELLED,
    DialysisSessionStatus.MISSED,
  ];

  constructor(private readonly prisma: PrismaService) {}

  async getReadableSession(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ): Promise<SessionAccessRecord> {
    const session = await this.getSessionOrThrow(sessionId);
    await this.assertPatientOwnsPatient(
      requesterUserId,
      requesterRole,
      session.patient_id,
    );
    return session;
  }

  async getWritableSession(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ): Promise<SessionAccessRecord> {
    if (requesterRole === Role.PATIENT) {
      throw new ForbiddenException(
        'The patient is not allowed to add or modify the details of the washing session.',
      );
    }

    const session = await this.getSessionOrThrow(sessionId);
    const now = new Date();

    if (session.start_time > now) {
      throw new BadRequestException(
        'Details of a session that has not yet started cannot be recorded.',
      );
    }

    if (this.closedStatuses.includes(session.status)) {
      throw new BadRequestException(
        'Details of an expired or canceled session cannot be edited.',
      );
    }

    return session;
  }

  async assertPatientOwnsPatient(
    requesterUserId: number,
    requesterRole: Role,
    patientId: number,
  ): Promise<void> {
    if (requesterRole !== Role.PATIENT) {
      return;
    }

    const patient = await this.prisma.patient.findUnique({
      where: { user_id: requesterUserId },
      select: { patient_id: true },
    });

    if (!patient || patient.patient_id !== patientId) {
      throw new ForbiddenException("You cannot access another patient's data.");
    }
  }

  async resolveRecorderNurseId(
    requesterUserId: number,
    requesterRole: Role,
    fallbackNurseId: number,
  ): Promise<number> {
    if (requesterRole !== Role.NURSE) {
      return fallbackNurseId;
    }

    const nurse = await this.prisma.nurse.findUnique({
      where: { user_id: requesterUserId },
      select: { nurse_id: true },
    });

    if (!nurse) {
      throw new ForbiddenException(
        'This process is only available for nurse accounts.',
      );
    }

    return nurse.nurse_id;
  }

  private async getSessionOrThrow(
    sessionId: number,
  ): Promise<SessionAccessRecord> {
    const session = await this.prisma.dialysisSession.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        patient_id: true,
        nurse_id: true,
        start_time: true,
        end_time: true,
        status: true,
      },
    });

    if (!session) {
      throw new NotFoundException(
        `The wash session with number ${sessionId} was not found.`,
      );
    }

    return session;
  }
}
