import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateVitalSignsDto } from '../dto/create-vital-signs.dto';
import { DialysisSessionAccessService } from './dialysis-session-access.service';

@Injectable()
export class SessionVitalSignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionAccess: DialysisSessionAccessService,
  ) {}

  async recordVitalSigns(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    dto: CreateVitalSignsDto,
  ) {
    if (
      dto.systolic === undefined &&
      dto.diastolic === undefined &&
      dto.pulse === undefined &&
      dto.temperature === undefined &&
      dto.oxygenSaturation === undefined
    ) {
      throw new BadRequestException(
        'At least one vital value must be entered before saving.',
      );
    }

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

    return this.prisma.sessionVitalSigns.create({
      data: {
        session_id: sessionId,
        recorded_by_nurse_id: nurseId,
        systolic: dto.systolic,
        diastolic: dto.diastolic,
        pulse: dto.pulse,
        temperature: dto.temperature,
        oxygen_saturation: dto.oxygenSaturation,
      },
      include: {
        nurse: { select: { nurse_id: true, full_name: true } },
        session: { select: { session_id: true, patient_id: true } },
      },
    });
  }

  async getSessionVitalSigns(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    await this.sessionAccess.getReadableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    return this.prisma.sessionVitalSigns.findMany({
      where: { session_id: sessionId },
      include: {
        nurse: { select: { nurse_id: true, full_name: true } },
      },
      orderBy: { recorded_at: 'asc' },
    });
  }

  async getLatestVitalSigns(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    await this.sessionAccess.getReadableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    return this.prisma.sessionVitalSigns.findFirst({
      where: { session_id: sessionId },
      include: {
        nurse: { select: { nurse_id: true, full_name: true } },
      },
      orderBy: { recorded_at: 'desc' },
    });
  }

  async deleteVitalSign(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    vitalSignId: number,
  ) {
    if (requesterRole === Role.PATIENT) {
      throw new ForbiddenException('The patient cannot delete vital readings.');
    }

    await this.sessionAccess.getWritableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    const vitalSign = await this.prisma.sessionVitalSigns.findFirst({
      where: {
        vital_id: vitalSignId,
        session_id: sessionId,
      },
      select: { vital_id: true },
    });

    if (!vitalSign) {
      throw new NotFoundException(
        'Bioreading is not available within this session.',
      );
    }

    return this.prisma.sessionVitalSigns.delete({
      where: { vital_id: vitalSignId },
    });
  }
}
