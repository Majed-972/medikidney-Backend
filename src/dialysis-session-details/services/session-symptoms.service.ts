import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateSymptomDto } from '../dto/create-symptom.dto';
import { DialysisSessionAccessService } from './dialysis-session-access.service';

@Injectable()
export class SessionSymptomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionAccess: DialysisSessionAccessService,
  ) {}

  async recordSymptom(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    dto: CreateSymptomDto,
  ) {
    await this.sessionAccess.getWritableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    return this.prisma.sessionSymptom.create({
      data: {
        session_id: sessionId,
        symptom_type: dto.symptomType,
        severity: dto.severity,
        notes: dto.notes,
      },
      include: {
        session: { select: { session_id: true, patient_id: true } },
      },
    });
  }

  async getSessionSymptoms(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    await this.sessionAccess.getReadableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    return this.prisma.sessionSymptom.findMany({
      where: { session_id: sessionId },
      orderBy: { occurred_at: 'asc' },
    });
  }

  async getSymptomsStatistics(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    await this.sessionAccess.getReadableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    const symptoms = await this.prisma.sessionSymptom.findMany({
      where: { session_id: sessionId },
    });

    const statistics = symptoms.reduce<Record<string, Record<string, number>>>(
      (result, symptom) => {
        if (!result[symptom.symptom_type]) {
          result[symptom.symptom_type] = {};
        }

        result[symptom.symptom_type][symptom.severity] =
          (result[symptom.symptom_type][symptom.severity] ?? 0) + 1;

        return result;
      },
      {},
    );

    return {
      totalSymptoms: symptoms.length,
      symptomsBreakdown: statistics,
      details: symptoms,
    };
  }

  async deleteSymptom(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    symptomId: number,
  ) {
    if (requesterRole === Role.PATIENT) {
      throw new ForbiddenException(
        'The patient cannot delete symptom records.',
      );
    }

    await this.sessionAccess.getWritableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    const symptom = await this.prisma.sessionSymptom.findFirst({
      where: {
        symptom_id: symptomId,
        session_id: sessionId,
      },
      select: { symptom_id: true },
    });

    if (!symptom) {
      throw new NotFoundException(
        'The viewer record does not exist within this session.',
      );
    }

    return this.prisma.sessionSymptom.delete({
      where: { symptom_id: symptomId },
    });
  }
}
