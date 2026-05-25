import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DialysisSessionStatus, Role, Weekday } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateDialysisSessionDto } from './dto/create-dialysis-session.dto';
import { UpdateDialysisSessionStatusDto } from './dto/update-dialysis-session-status.dto';
import {
  buildLocalTimeOnlyDate,
  parseDialysisTimeInput,
  serializeDialysisSessionTimes,
} from './dialysis-session-time.util';

const detailedSessionInclude = {
  patient: { select: { patient_id: true, full_name: true } },
  nurse: { select: { nurse_id: true, full_name: true } },
  schedule: {
    select: {
      schedule_id: true,
      weekday: true,
      shift_number: true,
      machine_number: true,
    },
  },
  vitalSigns: {
    include: {
      nurse: {
        select: { full_name: true },
      },
    },
    orderBy: { recorded_at: 'asc' as const },
  },
  medications: {
    include: {
      nurse: {
        select: { full_name: true },
      },
    },
    orderBy: { administered_at: 'asc' as const },
  },
  dialysisSettings: {
    include: {
      nurse: {
        select: { full_name: true },
      },
    },
    orderBy: { recorded_at: 'asc' as const },
  },
  symptoms: {
    orderBy: { occurred_at: 'asc' as const },
  },
};

@Injectable()
export class DialysisSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async getNurseByUserId(userId: number) {
    const nurse = await this.prisma.nurse.findUnique({
      where: { user_id: userId },
      select: { nurse_id: true, full_name: true },
    });

    if (!nurse) {
      throw new ForbiddenException(
        "Washing sessions can only be carried out via an account linked to a nurse's data.",
      );
    }

    return nurse;
  }

  private getWeekdayFromDate(date: Date): Weekday {
    const day = date.getDay();

    switch (day) {
      case 6:
        return Weekday.SATURDAY;
      case 0:
        return Weekday.SUNDAY;
      case 1:
        return Weekday.MONDAY;
      case 2:
        return Weekday.TUESDAY;
      case 3:
        return Weekday.WEDNESDAY;
      case 4:
        return Weekday.THURSDAY;
      case 5:
        return Weekday.FRIDAY;
      default:
        throw new BadRequestException(
          'Unable to determine the day of the week.',
        );
    }
  }

  private async getPatientIdByUserId(userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('No patient data was found for this user.');
    }

    return patient.patient_id;
  }

  private serializeSession<
    T extends {
      start_time?: Date | string | null;
      end_time?: Date | string | null;
    },
  >(session: T) {
    return serializeDialysisSessionTimes(session);
  }

  private serializeSessions<
    T extends {
      start_time?: Date | string | null;
      end_time?: Date | string | null;
    },
  >(sessions: T[]) {
    return sessions.map((session) => this.serializeSession(session));
  }

  private shouldRecordSessionEndTime(nextStatus?: DialysisSessionStatus) {
    return (
      nextStatus === DialysisSessionStatus.COMPLETED ||
      nextStatus === DialysisSessionStatus.CANCELLED ||
      nextStatus === DialysisSessionStatus.MISSED
    );
  }

  private assertSessionAllowsWeightEntry(
    session: {
      status: DialysisSessionStatus;
      end_time: Date | null;
    },
    nextStatus?: DialysisSessionStatus,
  ) {
    const effectiveStatus = nextStatus ?? session.status;

    if (
      effectiveStatus === DialysisSessionStatus.CANCELLED ||
      effectiveStatus === DialysisSessionStatus.MISSED
    ) {
      throw new BadRequestException(
        'No weight can be entered after the session has been canceled or considered missed.',
      );
    }

    const isSessionFinished =
      session.end_time !== null ||
      session.status === DialysisSessionStatus.COMPLETED ||
      nextStatus === DialysisSessionStatus.COMPLETED;

    if (!isSessionFinished) {
      throw new BadRequestException(
        'No weight can be entered after the session has been canceled or considered missed.',
      );
    }
  }

  async createSession(userId: number, dto: CreateDialysisSessionDto) {
    const [nurse, patient, schedule] = await Promise.all([
      this.getNurseByUserId(userId),
      this.prisma.patient.findUnique({
        where: { patient_id: dto.patientId },
        select: { patient_id: true, full_name: true },
      }),
      this.prisma.dialysisSchedule.findUnique({
        where: { schedule_id: dto.scheduleId },
        select: {
          schedule_id: true,
          patient_id: true,
          weekday: true,
          shift_number: true,
          machine_number: true,
        },
      }),
    ]);

    if (!patient) {
      throw new NotFoundException('No patient data was found for this user.');
    }

    if (!schedule) {
      throw new NotFoundException(
        'No dialysis schedule was found for this patient.',
      );
    }

    if (schedule.patient_id !== dto.patientId) {
      throw new ForbiddenException(
        'The specified schedule does not belong to this patient.',
      );
    }

    const sessionDate = new Date(dto.date);
    const sessionStartTime = parseDialysisTimeInput(dto.startTime, 'startTime');
    const sessionEndTime = dto.endTime
      ? parseDialysisTimeInput(dto.endTime, 'endTime')
      : null;

    if (Number.isNaN(sessionDate.getTime())) {
      throw new BadRequestException('date is invalid.');
    }

    if (Number.isNaN(sessionStartTime.getTime())) {
      throw new BadRequestException('startTime is invalid.');
    }

    if (sessionEndTime && Number.isNaN(sessionEndTime.getTime())) {
      throw new BadRequestException('endTime is invalid.');
    }

    if (sessionEndTime && sessionEndTime <= sessionStartTime) {
      throw new BadRequestException('endTime must be after startTime.');
    }

    const actualWeekday = this.getWeekdayFromDate(sessionDate);

    if (actualWeekday !== schedule.weekday) {
      throw new BadRequestException(
        `This schedule is for ${schedule.weekday} but the submitted date falls on ${actualWeekday}.`,
      );
    }

    const existingSession = await this.prisma.dialysisSession.findFirst({
      where: {
        schedule_id: dto.scheduleId,
        date: sessionDate,
      },
      select: { session_id: true },
    });

    if (existingSession) {
      throw new ConflictException(
        'A physical session was already created for this table on the specified date.',
      );
    }

    const createdSession = await this.prisma.dialysisSession.create({
      data: {
        patient_id: dto.patientId,
        nurse_id: nurse.nurse_id,
        schedule_id: dto.scheduleId,
        date: sessionDate,
        start_time: sessionStartTime,
        end_time: sessionEndTime,
        weight_before: dto.weightBefore,
        weight_after: dto.weightAfter ?? null,
        fluid_removed: dto.fluidRemoved ?? null,
        blood_pressure_before: dto.bloodPressureBefore ?? null,
        blood_pressure_after: dto.bloodPressureAfter ?? null,
        notes: dto.notes ?? null,
        status: dto.status ?? DialysisSessionStatus.PENDING,
      },
      include: {
        patient: {
          select: {
            patient_id: true,
            full_name: true,
          },
        },
        nurse: {
          select: {
            nurse_id: true,
            full_name: true,
          },
        },
        schedule: {
          select: {
            schedule_id: true,
            weekday: true,
            shift_number: true,
            machine_number: true,
          },
        },
      },
    });

    return this.serializeSession(createdSession);
  }

  async getSessionsForRequest(
    requesterUserId: number,
    requesterRole: Role,
    patientIdFromQuery?: number,
  ) {
    const patientId =
      requesterRole === Role.PATIENT
        ? await this.getPatientIdByUserId(requesterUserId)
        : patientIdFromQuery;

    if (requesterRole !== Role.PATIENT && patientId === undefined) {
      const sessions = await this.prisma.dialysisSession.findMany({
        include: detailedSessionInclude,
        orderBy: [{ date: 'desc' }, { start_time: 'desc' }],
      });

      return this.serializeSessions(sessions);
    }

    if (patientId === undefined) {
      throw new BadRequestException('Invalid patientId.');
    }

    const sessions = await this.prisma.dialysisSession.findMany({
      where: { patient_id: patientId },
      include: detailedSessionInclude,
      orderBy: [{ date: 'desc' }, { start_time: 'desc' }],
    });

    return this.serializeSessions(sessions);
  }

  async getSessionDetailForRequest(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    if (requesterRole === Role.PATIENT) {
      const session = await this.prisma.dialysisSession.findFirst({
        where: {
          session_id: sessionId,
          patient: { user_id: requesterUserId },
        },
        include: detailedSessionInclude,
      });

      if (!session) {
        throw new NotFoundException('This session was not found.');
      }

      return this.serializeSession(session);
    }

    const session = await this.prisma.dialysisSession.findUnique({
      where: { session_id: sessionId },
      include: detailedSessionInclude,
    });

    if (!session) {
      throw new NotFoundException('This session was not found.');
    }

    return this.serializeSession(session);
  }

  async updateSessionStatus(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
    dto: UpdateDialysisSessionStatusDto,
  ) {
    const session = await this.prisma.dialysisSession.findUnique({
      where: { session_id: sessionId },
      select: {
        session_id: true,
        patient_id: true,
        status: true,
        start_time: true,
        end_time: true,
        weight_after: true,
      },
    });

    if (!session) {
      throw new NotFoundException('This wash session was not found.');
    }

    const data: {
      status?: DialysisSessionStatus;
      weight_after?: number;
      end_time?: Date;
    } = {};

    if (requesterRole === Role.NURSE) {
      await this.getNurseByUserId(requesterUserId);

      if (dto.status === undefined && dto.weightAfter === undefined) {
        throw new BadRequestException('Status or weightAfter must be sent.');
      }

      if (dto.status !== undefined) {
        data.status = dto.status;

        if (
          session.end_time === null &&
          this.shouldRecordSessionEndTime(dto.status)
        ) {
          const resolvedEndTime = dto.endTime
            ? parseDialysisTimeInput(dto.endTime, 'endTime')
            : buildLocalTimeOnlyDate();

          if (resolvedEndTime <= session.start_time) {
            throw new BadRequestException('endTime must be after startTime.');
          }

          data.end_time = resolvedEndTime;
        }
      }

      if (dto.weightAfter !== undefined) {
        if (session.weight_after !== null) {
          throw new ConflictException(
            'Post-session weight was pre-introduced.',
          );
        }

        this.assertSessionAllowsWeightEntry(session, dto.status);
        data.weight_after = dto.weightAfter;
      }
    } else if (requesterRole === Role.PATIENT) {
      const patientId = await this.getPatientIdByUserId(requesterUserId);

      if (patientId !== session.patient_id) {
        throw new ForbiddenException(
          'You cannot adjust the weight of this washing session.',
        );
      }

      if (dto.status !== undefined) {
        throw new ForbiddenException('Patients cannot update session status.');
      }

      if (dto.weightAfter === undefined) {
        throw new BadRequestException('weightAfter must be sent.');
      }

      if (session.weight_after !== null) {
        throw new ConflictException('Post-session weight was pre-introduced.');
      }

      this.assertSessionAllowsWeightEntry(session);
      data.weight_after = dto.weightAfter;
    } else {
      throw new ForbiddenException(
        'Only nurses and patients can update washing sessions.',
      );
    }

    const updatedSession = await this.prisma.dialysisSession.update({
      where: { session_id: sessionId },
      data,
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        nurse: { select: { nurse_id: true, full_name: true } },
        schedule: {
          select: {
            schedule_id: true,
            weekday: true,
            shift_number: true,
            machine_number: true,
          },
        },
      },
    });

    // ✨ CHECK: Was the session completed without entering the weight?
    if (
      updatedSession.status === DialysisSessionStatus.COMPLETED &&
      updatedSession.weight_after === null &&
      requesterRole === Role.NURSE
    ) {
      await this.notificationsService.sendNotificationToPatient(
        updatedSession.patient_id,
        '⚠️ Important warning',
        'Your weight is not entered after the washing session. Please measure your weight and enter it into the app',
        'SESSION_NO_WEIGHT',
        sessionId,
      );
    }

    return this.serializeSession(updatedSession);
  }
}
