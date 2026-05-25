import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Weekday } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateDoctorScheduleDto } from './dto/create-doctor-schedule.dto';

@Injectable()
export class DoctorScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly weekdayValues: Weekday[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];

  private async getDoctorIdByUserId(userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
      select: { doctor_id: true },
    });

    if (!doctor) {
      throw new ForbiddenException(
        'This user does not have a doctor profile associated with him. Appointment schedule cannot be managed.',
      );
    }

    return doctor.doctor_id;
  }

  async createOrUpdateSchedule(
    requesterUserId: number,
    dto: CreateDoctorScheduleDto,
  ) {
    const doctorId = await this.getDoctorIdByUserId(requesterUserId);
    const startTime = this.parseTime(dto.start_time);
    const endTime = this.parseTime(dto.end_time);

    if (!startTime || !endTime) {
      throw new BadRequestException(
        'Invalid time format. It must be in HH:mm:ss format.',
      );
    }

    if (endTime <= startTime) {
      throw new BadRequestException(
        'The end time must be later than the start time.',
      );
    }

    return this.prisma.doctorSchedule.upsert({
      where: {
        doctor_id_weekday: {
          doctor_id: doctorId,
          weekday: dto.weekday,
        },
      },
      create: {
        doctor_id: doctorId,
        weekday: dto.weekday,
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      },
      update: {
        start_time: startTime,
        end_time: endTime,
        is_active: true,
      },
      include: {
        doctor: {
          select: {
            doctor_id: true,
            full_name: true,
          },
        },
      },
    });
  }

  async deleteScheduleDay(requesterUserId: number, weekday: string) {
    const doctorId = await this.getDoctorIdByUserId(requesterUserId);
    const normalizedWeekday = weekday.toUpperCase();

    if (!this.weekdayValues.includes(normalizedWeekday as Weekday)) {
      throw new BadRequestException('Invalid weekday.');
    }

    const existingSchedule = await this.prisma.doctorSchedule.findUnique({
      where: {
        doctor_id_weekday: {
          doctor_id: doctorId,
          weekday: normalizedWeekday as Weekday,
        },
      },
      select: { schedule_id: true },
    });

    if (!existingSchedule) {
      throw new BadRequestException('This day is not part of the schedule.');
    }

    await this.prisma.doctorSchedule.delete({
      where: {
        doctor_id_weekday: {
          doctor_id: doctorId,
          weekday: normalizedWeekday as Weekday,
        },
      },
    });

    return { success: true };
  }

  async getDoctorSchedule(doctorId: number) {
    await this.prisma.doctor.findUniqueOrThrow({
      where: { doctor_id: doctorId },
    });

    return this.prisma.doctorSchedule.findMany({
      where: {
        doctor_id: doctorId,
        is_active: true,
      },
      include: {
        doctor: {
          select: {
            doctor_id: true,
            full_name: true,
          },
        },
      },
      orderBy: { weekday: 'asc' },
    });
  }

  async getScheduleWindowForDate(doctorId: number, date: Date) {
    const dayName = this.getDayName(date);

    return this.prisma.doctorSchedule.findFirst({
      where: {
        doctor_id: doctorId,
        weekday: dayName,
        is_active: true,
      },
    });
  }

  async isTimeAvailable(
    doctorId: number,
    date: Date,
    time: Date,
  ): Promise<boolean> {
    const schedule = await this.getScheduleWindowForDate(doctorId, date);

    if (!schedule) {
      return false;
    }

    const requestedMinutes = time.getHours() * 60 + time.getMinutes();
    const scheduleStartMinutes =
      schedule.start_time.getHours() * 60 + schedule.start_time.getMinutes();
    const scheduleEndMinutes =
      schedule.end_time.getHours() * 60 + schedule.end_time.getMinutes();

    return (
      requestedMinutes >= scheduleStartMinutes &&
      requestedMinutes < scheduleEndMinutes
    );
  }

  private parseTime(timeStr: string): Date | null {
    const [hours, minutes, seconds] = timeStr.split(':');
    if (!hours || !minutes) return null;

    const parsedHours = parseInt(hours, 10);
    const parsedMinutes = parseInt(minutes, 10);
    const parsedSeconds = parseInt(seconds || '0', 10);

    if (
      Number.isNaN(parsedHours) ||
      Number.isNaN(parsedMinutes) ||
      Number.isNaN(parsedSeconds)
    ) {
      return null;
    }

    const parsedTime = new Date();
    parsedTime.setHours(parsedHours, parsedMinutes, parsedSeconds, 0);
    return parsedTime;
  }

  private getDayName(date: Date): Weekday {
    const dayIndex = date.getDay();
    const dayNames: Weekday[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];

    return dayNames[dayIndex];
  }
}
