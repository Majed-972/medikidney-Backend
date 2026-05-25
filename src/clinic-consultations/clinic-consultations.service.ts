import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentType,
  DialysisSessionStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { DoctorScheduleService } from '../doctor-schedule/doctor-schedule.service';
import { PrismaService } from '../prisma/PrismaService';
import { FilterClinicConsultationsDto } from './dto/filter-clinic-consultations.dto';
import { GetClinicConsultationAvailabilityDto } from './dto/get-clinic-consultation-availability.dto';
import { DoctorBookClinicConsultationDto } from './dto/doctor-book-clinic-consultation.dto';
import { PatientBookClinicConsultationDto } from './dto/patient-book-clinic-consultation.dto';
import { UpdateClinicConsultationStatusDto } from './dto/update-clinic-consultation-status.dto';

const CLINIC_REVIEW_TYPE: AppointmentType = AppointmentType.CLINIC_REVIEW;
const STATUS_SCHEDULED: AppointmentStatus = AppointmentStatus.SCHEDULED;
const STATUS_COMPLETED: AppointmentStatus = AppointmentStatus.COMPLETED;
const STATUS_CANCELLED: AppointmentStatus = AppointmentStatus.CANCELLED;
const STATUS_NO_SHOW: AppointmentStatus = AppointmentStatus.NO_SHOW;
const DIALYSIS_SESSION_STATUS_CANCELLED: DialysisSessionStatus =
  DialysisSessionStatus.CANCELLED;
const APPOINTMENT_SLOT_MINUTES = 15;
const CANCELLATION_LOCK_WINDOW_MINUTES = 60;
const MAX_CONSECUTIVE_NO_SHOWS = 3;

type ClinicConsultationAvailability = {
  doctorId: number;
  date: string;
  slotMinutes: number;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  bookingAllowed: boolean;
  bookingRestrictionReason: string | null;
  availableSlots: string[];
  bookedSlots: string[];
};

@Injectable()
export class ClinicConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doctorScheduleService: DoctorScheduleService,
  ) {}

  private async getDoctorIdByUserId(userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
      select: { doctor_id: true },
    });

    if (!doctor) {
      throw new ForbiddenException(
        'You do not have the necessary permissions to access this resource.',
      );
    }

    return doctor.doctor_id;
  }

  private async ensureDoctorExists(doctorId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { doctor_id: doctorId },
      select: { doctor_id: true },
    });

    if (!doctor) {
      throw new NotFoundException('The doctor is not present');
    }

    return doctor.doctor_id;
  }

  private async ensureBookableDoctorExists(doctorId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { doctor_id: doctorId },
      select: { doctor_id: true, isHead: true },
    });

    if (!doctor) {
      throw new NotFoundException('The doctor is not present');
    }

    if (doctor.isHead) {
      throw new BadRequestException(
        'It is not possible to book an appointment with the main doctor.',
      );
    }

    return doctor.doctor_id;
  }

  private async getPatientIdByUserId(userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    return patient.patient_id;
  }

  private async ensurePatientExists(patientId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { patient_id: patientId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    return patient.patient_id;
  }

  private normalizeDateOnly(value: string) {
    const trimmed = value.trim();
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);

    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      const parsedDate = new Date(year, month, day);

      parsedDate.setHours(0, 0, 0, 0);
      return parsedDate;
    }

    const parsedDate = new Date(trimmed);

    if (Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    const normalizedDate = new Date(
      parsedDate.getFullYear(),
      parsedDate.getMonth(),
      parsedDate.getDate(),
    );

    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }

  private normalizeTimeOnly(value: string) {
    const trimmed = value.trim();
    const timeOnlyMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    const isoTimeMatch = /T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
    const dateTimeMatch = /(?:T|\s)(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
    const hours = Number(
      timeOnlyMatch?.[1] ?? isoTimeMatch?.[1] ?? dateTimeMatch?.[1],
    );
    const minutes = Number(
      timeOnlyMatch?.[2] ?? isoTimeMatch?.[2] ?? dateTimeMatch?.[2],
    );
    const seconds = Number(
      timeOnlyMatch?.[3] ?? isoTimeMatch?.[3] ?? dateTimeMatch?.[3] ?? '0',
    );

    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      Number.isNaN(seconds) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      return null;
    }

    const parsedTime = new Date();
    parsedTime.setFullYear(1970, 0, 1);
    parsedTime.setHours(hours, minutes, seconds, 0);
    return parsedTime;
  }

  private formatDateOnly(value: Date) {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatTimeOnly(value: Date) {
    const hours = `${value.getHours()}`.padStart(2, '0');
    const minutes = `${value.getMinutes()}`.padStart(2, '0');
    const seconds = `${value.getSeconds()}`.padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }

  private serializeAppointment<T extends { appt_date: Date; appt_time: Date }>(
    appointment: T,
  ) {
    return {
      ...appointment,
      appt_date: this.formatDateOnly(appointment.appt_date),
      appt_time: this.formatTimeOnly(appointment.appt_time),
    };
  }

  private serializeBookingAccess(
    access: {
      doctor_id: number;
      patient_id: number;
      consecutive_no_show_count: number;
      is_booking_blocked: boolean;
      blocked_at: Date | null;
    } | null,
    doctorId: number,
    patientId: number,
  ) {
    return {
      doctor_id: doctorId,
      patient_id: patientId,
      consecutive_no_show_count: access?.consecutive_no_show_count ?? 0,
      is_booking_blocked: access?.is_booking_blocked ?? false,
      blocked_at: access?.blocked_at ?? null,
      can_book: !(access?.is_booking_blocked ?? false),
    };
  }

  private combineAppointmentDateTime(date: Date, time: Date) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes(),
      time.getSeconds(),
      0,
    );
  }

  private buildSlots(startTime: Date, endTime: Date) {
    const slots: string[] = [];
    const current = new Date(startTime);
    current.setSeconds(0, 0);
    const stop = new Date(endTime);
    stop.setSeconds(0, 0);

    while (current < stop) {
      slots.push(this.formatTimeOnly(current));
      current.setMinutes(current.getMinutes() + APPOINTMENT_SLOT_MINUTES);
    }

    return slots;
  }

  private isSameCalendarDate(left: Date, right: Date) {
    return (
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
    );
  }

  private async getBookingAccessRecord(doctorId: number, patientId: number) {
    return this.prisma.doctorPatientBookingAccess.findUnique({
      where: {
        doctor_id_patient_id: {
          doctor_id: doctorId,
          patient_id: patientId,
        },
      },
    });
  }

  private async getSameDayAppointment(
    doctorId: number,
    patientId: number,
    apptDate: Date,
  ) {
    return this.prisma.doctorAppointment.findFirst({
      where: {
        doctor_id: doctorId,
        patient_id: patientId,
        appointment_type: CLINIC_REVIEW_TYPE,
        appt_date: apptDate,
        status: {
          in: [STATUS_SCHEDULED, STATUS_COMPLETED, STATUS_NO_SHOW],
        },
      },
      select: {
        appointment_id: true,
        status: true,
      },
    });
  }

  private addMinutes(value: Date, minutes: number) {
    const result = new Date(value);
    result.setMinutes(result.getMinutes() + minutes);
    return result;
  }

  private hasTimeRangeOverlap(
    leftStart: Date,
    leftEnd: Date,
    rightStart: Date,
    rightEnd: Date,
  ) {
    return leftStart < rightEnd && rightStart < leftEnd;
  }

  private getDialysisSessionEffectiveEndTime(session: {
    start_time: Date;
    end_time: Date | null;
  }) {
    return (
      session.end_time ??
      this.addMinutes(session.start_time, APPOINTMENT_SLOT_MINUTES)
    );
  }

  private async getPatientUnavailableClinicSlots(
    patientId: number,
    apptDate: Date,
    candidateSlots: string[],
  ) {
    const [sameTimeAppointments, dialysisSessions] = await Promise.all([
      this.prisma.doctorAppointment.findMany({
        where: {
          patient_id: patientId,
          appointment_type: CLINIC_REVIEW_TYPE,
          appt_date: apptDate,
          status: {
            in: [STATUS_SCHEDULED, STATUS_COMPLETED, STATUS_NO_SHOW],
          },
        },
        select: {
          appt_time: true,
        },
      }),
      this.prisma.dialysisSession.findMany({
        where: {
          patient_id: patientId,
          date: apptDate,
          status: {
            not: DIALYSIS_SESSION_STATUS_CANCELLED,
          },
        },
        select: {
          start_time: true,
          end_time: true,
        },
      }),
    ]);

    const unavailableSlots = new Set<string>(
      sameTimeAppointments.map((appointment) =>
        this.formatTimeOnly(appointment.appt_time),
      ),
    );

    for (const slot of candidateSlots) {
      const slotTime = this.normalizeTimeOnly(slot);

      if (!slotTime) {
        continue;
      }

      const slotStart = this.combineAppointmentDateTime(apptDate, slotTime);
      const slotEnd = this.addMinutes(slotStart, APPOINTMENT_SLOT_MINUTES);
      const hasDialysisConflict = dialysisSessions.some((dialysisSession) =>
        this.hasTimeRangeOverlap(
          slotStart,
          slotEnd,
          dialysisSession.start_time,
          this.getDialysisSessionEffectiveEndTime(dialysisSession),
        ),
      );

      if (hasDialysisConflict) {
        unavailableSlots.add(slot);
      }
    }

    return unavailableSlots;
  }

  private async getPatientBookingConflictMessage(
    patientId: number,
    doctorId: number,
    apptDate: Date,
    apptTime: Date,
  ) {
    const sameTimeAppointment = await this.prisma.doctorAppointment.findFirst({
      where: {
        patient_id: patientId,
        appointment_type: CLINIC_REVIEW_TYPE,
        appt_date: apptDate,
        appt_time: apptTime,
        status: {
          in: [STATUS_SCHEDULED, STATUS_COMPLETED, STATUS_NO_SHOW],
        },
      },
      select: {
        doctor_id: true,
      },
    });

    if (sameTimeAppointment) {
      return sameTimeAppointment.doctor_id === doctorId
        ? 'You already have an appointment with this doctor at this time.'
        : 'You already have another clinic appointment at this time with another doctor.';
    }

    const appointmentStart = this.combineAppointmentDateTime(
      apptDate,
      apptTime,
    );
    const appointmentEnd = this.addMinutes(
      appointmentStart,
      APPOINTMENT_SLOT_MINUTES,
    );

    const dialysisSessions = await this.prisma.dialysisSession.findMany({
      where: {
        patient_id: patientId,
        date: apptDate,
        status: {
          not: DIALYSIS_SESSION_STATUS_CANCELLED,
        },
      },
      select: {
        start_time: true,
        end_time: true,
      },
    });

    const hasDialysisConflict = dialysisSessions.some((dialysisSession) =>
      this.hasTimeRangeOverlap(
        appointmentStart,
        appointmentEnd,
        dialysisSession.start_time,
        this.getDialysisSessionEffectiveEndTime(dialysisSession),
      ),
    );

    if (hasDialysisConflict) {
      return 'It is not possible to book a clinic appointment at a time that conflicts with a dialysis session.';
    }

    return null;
  }

  private async buildAvailability(
    doctorId: number,
    apptDate: Date,
    patientId?: number,
  ): Promise<ClinicConsultationAvailability> {
    const formattedDate = this.formatDateOnly(apptDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const scheduleWindow =
      await this.doctorScheduleService.getScheduleWindowForDate(
        doctorId,
        apptDate,
      );

    const bookingAccess = patientId
      ? await this.getBookingAccessRecord(doctorId, patientId)
      : null;

    const sameDayAppointment = patientId
      ? await this.getSameDayAppointment(doctorId, patientId, apptDate)
      : null;

    const bookingRestrictionReason = bookingAccess?.is_booking_blocked
      ? 'You are not allowed to book this appointment due to no-shows for previous appointments. Please contact your doctor for more details.'
      : sameDayAppointment
        ? 'You already have an appointment with this doctor on the scheduled day.'
        : apptDate < today
          ? 'Appointments can only be made for current or future days.'
          : null;

    if (!scheduleWindow) {
      return {
        doctorId,
        date: formattedDate,
        slotMinutes: APPOINTMENT_SLOT_MINUTES,
        scheduleStart: null,
        scheduleEnd: null,
        bookingAllowed: !bookingRestrictionReason,
        bookingRestrictionReason,
        availableSlots: [],
        bookedSlots: [],
      };
    }

    const rawSlots = this.buildSlots(
      scheduleWindow.start_time,
      scheduleWindow.end_time,
    );
    const visibleSlots = rawSlots.filter((slot) => {
      if (apptDate < today) {
        return false;
      }

      if (!this.isSameCalendarDate(apptDate, today)) {
        return true;
      }

      const slotTime = this.normalizeTimeOnly(slot);

      if (!slotTime) {
        return false;
      }

      return this.combineAppointmentDateTime(apptDate, slotTime) > now;
    });

    const bookedAppointments = await this.prisma.doctorAppointment.findMany({
      where: {
        doctor_id: doctorId,
        appointment_type: CLINIC_REVIEW_TYPE,
        appt_date: apptDate,
        status: {
          in: [STATUS_SCHEDULED, STATUS_COMPLETED, STATUS_NO_SHOW],
        },
      },
      select: {
        appt_time: true,
      },
    });

    const visibleSlotSet = new Set(visibleSlots);
    const bookedSlots = Array.from(
      new Set(
        bookedAppointments.map((appointment) =>
          this.formatTimeOnly(appointment.appt_time),
        ),
      ),
    )
      .filter((slot) => visibleSlotSet.has(slot))
      .sort((left, right) => left.localeCompare(right));

    const bookedSlotSet = new Set(bookedSlots);
    const patientUnavailableSlots = patientId
      ? await this.getPatientUnavailableClinicSlots(
          patientId,
          apptDate,
          visibleSlots,
        )
      : new Set<string>();
    const availableSlots = visibleSlots.filter(
      (slot) => !bookedSlotSet.has(slot) && !patientUnavailableSlots.has(slot),
    );

    return {
      doctorId,
      date: formattedDate,
      slotMinutes: APPOINTMENT_SLOT_MINUTES,
      scheduleStart: this.formatTimeOnly(scheduleWindow.start_time),
      scheduleEnd: this.formatTimeOnly(scheduleWindow.end_time),
      bookingAllowed: !bookingRestrictionReason,
      bookingRestrictionReason,
      availableSlots,
      bookedSlots,
    };
  }

  async getClinicConsultationAvailabilityForRequest(
    requesterUserId: number,
    requesterRole: Role,
    dto: GetClinicConsultationAvailabilityDto,
  ) {
    const doctorId = await this.ensureBookableDoctorExists(dto.doctorId);
    const apptDate = this.normalizeDateOnly(dto.date);

    if (Number.isNaN(apptDate.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }

    if (requesterRole === Role.PATIENT) {
      const patientId = await this.getPatientIdByUserId(requesterUserId);
      return this.buildAvailability(doctorId, apptDate, patientId);
    }

    if (requesterRole === Role.DOCTOR) {
      const patientId = dto.patientId
        ? await this.ensurePatientExists(dto.patientId)
        : undefined;
      return this.buildAvailability(doctorId, apptDate, patientId);
    }

    throw new ForbiddenException(
      'Only doctors and patients have access to the availability of consultation appointments at the clinic.',
    );
  }

  async patientBookClinicConsultation(
    requesterUserId: number,
    dto: PatientBookClinicConsultationDto,
  ) {
    const patientId = await this.getPatientIdByUserId(requesterUserId);
    const doctorId = await this.ensureBookableDoctorExists(dto.doctorId);

    const apptDate = this.normalizeDateOnly(dto.apptDate);
    const apptTime = this.normalizeTimeOnly(dto.apptTime);

    if (Number.isNaN(apptDate.getTime()) || !apptTime) {
      throw new BadRequestException(
        'The appointment date or time format is incorrect.',
      );
    }

    const appointmentDateTime = this.combineAppointmentDateTime(
      apptDate,
      apptTime,
    );

    if (appointmentDateTime <= new Date()) {
      throw new BadRequestException(
        'Appointments can only be made for current or future days.',
      );
    }

    const availability = await this.buildAvailability(
      doctorId,
      apptDate,
      patientId,
    );
    const formattedRequestedTime = this.formatTimeOnly(apptTime);

    if (!availability.bookingAllowed) {
      throw new BadRequestException(
        availability.bookingRestrictionReason ||
          'Appointment booking is not permitted for this doctor at this time.',
      );
    }

    if (!availability.availableSlots.includes(formattedRequestedTime)) {
      throw new BadRequestException(
        'This time is not available for reservation. Please choose another time within the available times.',
      );
    }

    const patientConflictMessage = await this.getPatientBookingConflictMessage(
      patientId,
      doctorId,
      apptDate,
      apptTime,
    );

    if (patientConflictMessage) {
      throw new BadRequestException(patientConflictMessage);
    }

    const conflictingAppointment =
      await this.prisma.doctorAppointment.findFirst({
        where: {
          doctor_id: doctorId,
          appointment_type: CLINIC_REVIEW_TYPE,
          appt_date: apptDate,
          appt_time: apptTime,
          status: {
            in: [STATUS_SCHEDULED, STATUS_COMPLETED, STATUS_NO_SHOW],
          },
        },
        select: { appointment_id: true },
      });

    if (conflictingAppointment) {
      throw new BadRequestException(
        'This time is not available for reservation. Please choose another time within the available times.',
      );
    }

    const createdAppointment = await this.prisma.doctorAppointment.create({
      data: {
        doctor_id: doctorId,
        patient_id: patientId,
        appt_date: apptDate,
        appt_time: apptTime,
        is_booked: true,
        visit_reason: dto.visitReason ?? null,
        notes: dto.notes ?? null,
        appointment_type: CLINIC_REVIEW_TYPE,
        status: STATUS_SCHEDULED,
      },
      include: {
        doctor: { select: { doctor_id: true, full_name: true } },
        patient: { select: { patient_id: true, full_name: true } },
      },
    });

    return this.serializeAppointment(createdAppointment);
  }

  async doctorBookClinicConsultationForPatient(
    requesterUserId: number,
    patientId: number,
    dto: DoctorBookClinicConsultationDto,
  ) {
    const doctorId = await this.getDoctorIdByUserId(requesterUserId);
    const ensuredPatientId = await this.ensurePatientExists(patientId);

    const apptDate = this.normalizeDateOnly(dto.apptDate);
    const apptTime = this.normalizeTimeOnly(dto.apptTime);

    if (Number.isNaN(apptDate.getTime()) || !apptTime) {
      throw new BadRequestException(
        'The appointment date or time format is incorrect.',
      );
    }

    const appointmentDateTime = this.combineAppointmentDateTime(
      apptDate,
      apptTime,
    );

    if (appointmentDateTime <= new Date()) {
      throw new BadRequestException(
        'Appointments can be scheduled for current or future days only.',
      );
    }

    const sameDayAppointment = await this.getSameDayAppointment(
      doctorId,
      ensuredPatientId,
      apptDate,
    );

    if (sameDayAppointment) {
      throw new BadRequestException(
        'The patient already has an appointment with this doctor on the scheduled day.',
      );
    }

    const availability = await this.buildAvailability(
      doctorId,
      apptDate,
      ensuredPatientId,
    );
    const formattedRequestedTime = this.formatTimeOnly(apptTime);

    if (!availability.scheduleStart || !availability.scheduleEnd) {
      throw new BadRequestException(
        "There is no scheduled doctor's appointment on this date.",
      );
    }

    if (!availability.availableSlots.includes(formattedRequestedTime)) {
      throw new BadRequestException(
        'This time is not available for reservation. Please choose another time within the available times.',
      );
    }

    const patientConflictMessage = await this.getPatientBookingConflictMessage(
      ensuredPatientId,
      doctorId,
      apptDate,
      apptTime,
    );

    if (patientConflictMessage) {
      throw new BadRequestException(patientConflictMessage);
    }

    const conflictingAppointment =
      await this.prisma.doctorAppointment.findFirst({
        where: {
          doctor_id: doctorId,
          appointment_type: CLINIC_REVIEW_TYPE,
          appt_date: apptDate,
          appt_time: apptTime,
          status: {
            in: [STATUS_SCHEDULED, STATUS_COMPLETED, STATUS_NO_SHOW],
          },
        },
        select: { appointment_id: true },
      });

    if (conflictingAppointment) {
      throw new BadRequestException(
        'This time is not available for reservation. Please choose another time within the available times.',
      );
    }

    const createdAppointment = await this.prisma.doctorAppointment.create({
      data: {
        doctor_id: doctorId,
        patient_id: ensuredPatientId,
        appt_date: apptDate,
        appt_time: apptTime,
        is_booked: true,
        visit_reason:
          dto.visitReason?.trim() ||
          'A scheduled review appointment by a doctor',
        notes: dto.notes?.trim() || null,
        appointment_type: CLINIC_REVIEW_TYPE,
        status: STATUS_SCHEDULED,
      },
      include: {
        doctor: { select: { doctor_id: true, full_name: true } },
        patient: { select: { patient_id: true, full_name: true } },
      },
    });

    return this.serializeAppointment(createdAppointment);
  }
  async patientCancelClinicConsultation(
    requesterUserId: number,
    appointmentId: number,
  ) {
    const patientId = await this.getPatientIdByUserId(requesterUserId);

    const appointment = await this.prisma.doctorAppointment.findFirst({
      where: {
        appointment_id: appointmentId,
        patient_id: patientId,
        appointment_type: CLINIC_REVIEW_TYPE,
      },
      include: {
        doctor: { select: { doctor_id: true, full_name: true } },
        patient: { select: { patient_id: true, full_name: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        'The appointment does not exist or you are not allowed to cancel it.',
      );
    }

    if (appointment.status !== STATUS_SCHEDULED) {
      throw new BadRequestException(
        'Only scheduled appointments can be cancelled.',
      );
    }

    const minutesUntilAppointment =
      (this.combineAppointmentDateTime(
        appointment.appt_date,
        appointment.appt_time,
      ).getTime() -
        Date.now()) /
      60000;

    if (minutesUntilAppointment <= CANCELLATION_LOCK_WINDOW_MINUTES) {
      throw new BadRequestException(
        'Appointments cannot be canceled within an hour of the scheduled time.',
      );
    }

    const cancelledAppointment = await this.prisma.doctorAppointment.update({
      where: { appointment_id: appointmentId },
      data: {
        status: STATUS_CANCELLED,
        is_booked: false,
      },
      include: {
        doctor: { select: { doctor_id: true, full_name: true } },
        patient: { select: { patient_id: true, full_name: true } },
      },
    });

    return this.serializeAppointment(cancelledAppointment);
  }

  async getClinicConsultationsForRequest(
    requesterUserId: number,
    requesterRole: Role,
    filters: FilterClinicConsultationsDto,
  ) {
    const where: Prisma.DoctorAppointmentWhereInput = {
      appointment_type: CLINIC_REVIEW_TYPE,
    };

    if (requesterRole === Role.DOCTOR) {
      where.doctor_id = await this.getDoctorIdByUserId(requesterUserId);

      if (filters.patientId !== undefined) {
        where.patient_id = await this.ensurePatientExists(filters.patientId);
      }
    } else if (requesterRole === Role.PATIENT) {
      where.patient_id = await this.getPatientIdByUserId(requesterUserId);

      if (filters.doctorId !== undefined) {
        where.doctor_id = await this.ensureDoctorExists(filters.doctorId);
      }
    } else if (
      requesterRole === Role.NURSE ||
      requesterRole === Role.NUTRITIONIST
    ) {
      // Nurses and dietitians can see appointments based on filters without ownership restrictions
      if (filters.doctorId !== undefined) {
        where.doctor_id = await this.ensureDoctorExists(filters.doctorId);
      }
      if (filters.patientId !== undefined) {
        where.patient_id = await this.ensurePatientExists(filters.patientId);
      }
    } else {
      throw new ForbiddenException(
        'You do not have the necessary permissions to access consultation appointments at the clinic.',
      );
    }

    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    if (filters.date) {
      const normalizedDate = this.normalizeDateOnly(filters.date);

      if (Number.isNaN(normalizedDate.getTime())) {
        throw new BadRequestException(
          'Incorrect date format in query parameter.',
        );
      }

      where.appt_date = normalizedDate;
    }

    const appointments = await this.prisma.doctorAppointment.findMany({
      where,
      include: {
        doctor: { select: { doctor_id: true, full_name: true } },
        patient: { select: { patient_id: true, full_name: true } },
      },
      orderBy: [{ appt_date: 'asc' }, { appt_time: 'asc' }],
    });

    return appointments.map((appointment) =>
      this.serializeAppointment(appointment),
    );
  }

  async updateClinicConsultationStatusForDoctor(
    requesterUserId: number,
    appointmentId: number,
    dto: UpdateClinicConsultationStatusDto,
  ) {
    const doctorId = await this.getDoctorIdByUserId(requesterUserId);

    if (![STATUS_COMPLETED, STATUS_NO_SHOW].includes(dto.status)) {
      throw new BadRequestException(
        'Allows the doctor to update the appointment to completed or overdue only.',
      );
    }

    const appointment = await this.prisma.doctorAppointment.findFirst({
      where: {
        appointment_id: appointmentId,
        doctor_id: doctorId,
        appointment_type: CLINIC_REVIEW_TYPE,
      },
      include: {
        doctor: { select: { doctor_id: true, full_name: true } },
        patient: { select: { patient_id: true, full_name: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        'The appointment does not exist or does not belong to this doctor.',
      );
    }

    if (!appointment.patient_id) {
      throw new BadRequestException(
        'This appointment is not linked to a patient record.',
      );
    }

    if (appointment.status !== STATUS_SCHEDULED) {
      throw new BadRequestException(
        'Only scheduled appointments can be marked as complete or absent.',
      );
    }

    const patientId = appointment.patient_id;

    const result = await this.prisma.$transaction(async (tx) => {
      const consultationUpdateData: Prisma.DoctorAppointmentUpdateInput = {
        status: dto.status,
        is_booked: dto.status === STATUS_COMPLETED,
      };

      if (dto.notes !== undefined) {
        consultationUpdateData.notes = dto.notes.trim() || null;
      }

      if (dto.diagnosis !== undefined) {
        consultationUpdateData.diagnosis = dto.diagnosis.trim() || null;
      }

      if (dto.treatment_plan !== undefined) {
        consultationUpdateData.treatment_plan =
          dto.treatment_plan.trim() || null;
      }

      if (dto.medications !== undefined) {
        consultationUpdateData.medications = dto.medications.trim() || null;
      }

      const updatedAppointment = await tx.doctorAppointment.update({
        where: { appointment_id: appointmentId },
        data: consultationUpdateData,
        include: {
          doctor: { select: { doctor_id: true, full_name: true } },
          patient: { select: { patient_id: true, full_name: true } },
        },
      });

      const existingAccess = await tx.doctorPatientBookingAccess.findUnique({
        where: {
          doctor_id_patient_id: {
            doctor_id: doctorId,
            patient_id: patientId,
          },
        },
      });

      let bookingAccess: {
        doctor_id: number;
        patient_id: number;
        consecutive_no_show_count: number;
        is_booking_blocked: boolean;
        blocked_at: Date | null;
      } | null = existingAccess;

      if (dto.status === STATUS_COMPLETED) {
        bookingAccess = existingAccess
          ? await tx.doctorPatientBookingAccess.update({
              where: {
                doctor_id_patient_id: {
                  doctor_id: doctorId,
                  patient_id: patientId,
                },
              },
              data: {
                consecutive_no_show_count: 0,
                is_booking_blocked: false,
                blocked_at: null,
              },
            })
          : await tx.doctorPatientBookingAccess.create({
              data: {
                doctor_id: doctorId,
                patient_id: patientId,
                consecutive_no_show_count: 0,
                is_booking_blocked: false,
                blocked_at: null,
              },
            });
      } else {
        const nextNoShowCount =
          (existingAccess?.consecutive_no_show_count ?? 0) + 1;
        const shouldBlock = nextNoShowCount >= MAX_CONSECUTIVE_NO_SHOWS;

        bookingAccess = existingAccess
          ? await tx.doctorPatientBookingAccess.update({
              where: {
                doctor_id_patient_id: {
                  doctor_id: doctorId,
                  patient_id: patientId,
                },
              },
              data: {
                consecutive_no_show_count: nextNoShowCount,
                is_booking_blocked: shouldBlock,
                blocked_at: shouldBlock ? new Date() : null,
              },
            })
          : await tx.doctorPatientBookingAccess.create({
              data: {
                doctor_id: doctorId,
                patient_id: patientId,
                consecutive_no_show_count: nextNoShowCount,
                is_booking_blocked: shouldBlock,
                blocked_at: shouldBlock ? new Date() : null,
              },
            });
      }

      return {
        appointment: updatedAppointment,
        bookingAccess,
      };
    });

    return {
      appointment: this.serializeAppointment(result.appointment),
      bookingAccess: this.serializeBookingAccess(
        result.bookingAccess,
        doctorId,
        patientId,
      ),
    };
  }

  async getPatientBookingAccessForDoctor(
    requesterUserId: number,
    patientId: number,
  ) {
    const doctorId = await this.getDoctorIdByUserId(requesterUserId);
    const resolvedPatientId = await this.ensurePatientExists(patientId);
    const access = await this.getBookingAccessRecord(
      doctorId,
      resolvedPatientId,
    );

    return this.serializeBookingAccess(access, doctorId, resolvedPatientId);
  }

  async allowPatientBookingForDoctor(
    requesterUserId: number,
    patientId: number,
  ) {
    const doctorId = await this.getDoctorIdByUserId(requesterUserId);
    const resolvedPatientId = await this.ensurePatientExists(patientId);

    const access = await this.prisma.doctorPatientBookingAccess.upsert({
      where: {
        doctor_id_patient_id: {
          doctor_id: doctorId,
          patient_id: resolvedPatientId,
        },
      },
      create: {
        doctor_id: doctorId,
        patient_id: resolvedPatientId,
        consecutive_no_show_count: 0,
        is_booking_blocked: false,
        blocked_at: null,
      },
      update: {
        consecutive_no_show_count: 0,
        is_booking_blocked: false,
        blocked_at: null,
      },
    });

    return this.serializeBookingAccess(access, doctorId, resolvedPatientId);
  }
}
