import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateDialysisSettingsDto } from '../dto/create-dialysis-settings.dto';
import { DialysisSessionAccessService } from './dialysis-session-access.service';

@Injectable()
export class SessionDialysisSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionAccess: DialysisSessionAccessService,
  ) {}

  async recordDialysisSettings(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    dto: CreateDialysisSettingsDto,
  ) {
    if (
      dto.bloodFlowRate === undefined &&
      dto.dialysateFlow === undefined &&
      dto.ultrafiltrationRate === undefined
    ) {
      throw new BadRequestException(
        'At least one setting must be entered before saving.',
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

    return this.prisma.sessionDialysisSettings.create({
      data: {
        session_id: sessionId,
        recorded_by_nurse_id: nurseId,
        blood_flow_rate: dto.bloodFlowRate,
        dialysate_flow: dto.dialysateFlow,
        ultrafiltration_rate: dto.ultrafiltrationRate,
      },
      include: {
        nurse: { select: { nurse_id: true, full_name: true } },
        session: { select: { session_id: true, patient_id: true } },
      },
    });
  }

  async getSessionDialysisSettings(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    await this.sessionAccess.getReadableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    return this.prisma.sessionDialysisSettings.findMany({
      where: { session_id: sessionId },
      include: {
        nurse: { select: { nurse_id: true, full_name: true } },
      },
      orderBy: { recorded_at: 'asc' },
    });
  }

  async getLatestDialysisSettings(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    await this.sessionAccess.getReadableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    return this.prisma.sessionDialysisSettings.findFirst({
      where: { session_id: sessionId },
      include: {
        nurse: { select: { nurse_id: true, full_name: true } },
      },
      orderBy: { recorded_at: 'desc' },
    });
  }

  async deleteDialysisSettings(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    settingId: number,
  ) {
    if (requesterRole === Role.PATIENT) {
      throw new ForbiddenException(
        'The patient cannot delete device settings.',
      );
    }

    await this.sessionAccess.getWritableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    const setting = await this.prisma.sessionDialysisSettings.findFirst({
      where: {
        setting_id: settingId,
        session_id: sessionId,
      },
      select: { setting_id: true },
    });

    if (!setting) {
      throw new NotFoundException(
        'Device settings are not present within this session.',
      );
    }

    return this.prisma.sessionDialysisSettings.delete({
      where: { setting_id: settingId },
    });
  }
}
