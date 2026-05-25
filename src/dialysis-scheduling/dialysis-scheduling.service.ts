import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RadiologyRequestStatus, Role, Weekday } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateDialysisScheduleDto } from './dto/create-dialysis-schedule.dto';
import { PatchDialysisScheduleDto } from './dto/patch-dialysis-schedule.dto';
import { UpdateTotalMachinesDto } from './dto/update-total-machine.dto';
import { AssignNurseDto } from './dto/assign-nurse.dto';

const WEEKDAY_ORDER: Weekday[] = [
  Weekday.SATURDAY,
  Weekday.SUNDAY,
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
];

const DEFAULT_ACTIVE_SHIFT_COUNT = 4;

@Injectable()
export class DialysisSchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  private async getDialysisUnitConfig(
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    return client.dialysisUnitConfig.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        active_shift_count: DEFAULT_ACTIVE_SHIFT_COUNT,
      },
    });
  }

  private buildShiftNumbers(activeShiftCount: number) {
    return Array.from({ length: activeShiftCount }, (_, index) => index + 1);
  }

  private assertShiftNumberIsActive(
    shiftNumber: number,
    activeShiftCount: number,
  ) {
    if (shiftNumber > activeShiftCount) {
      throw new BadRequestException(
        `Shift ${shiftNumber} is not active. The department currently allows ${activeShiftCount} shift(s) only.`,
      );
    }
  }

  private assertShiftNumbersAreActive(
    shiftNumbers: number[],
    activeShiftCount: number,
  ) {
    for (const shiftNumber of shiftNumbers) {
      this.assertShiftNumberIsActive(shiftNumber, activeShiftCount);
    }
  }

  private async getDoctorByUserId(userId: number) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
      select: { doctor_id: true, isHead: true, full_name: true },
    });

    if (!doctor) {
      throw new ForbiddenException('The current user is not a doctor.');
    }

    return doctor;
  }

  private async getPatientIdByUserId(userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('No patient data found.');
    }

    return patient.patient_id;
  }

  private async ensureDepartmentHead(userId: number) {
    const doctor = await this.getDoctorByUserId(userId);

    if (!doctor.isHead) {
      throw new ForbiddenException(
        'Not allowed: This process is only available to the department head.',
      );
    }

    return doctor;
  }

  private async ensurePatientExists(patientId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { patient_id: patientId },
      select: { patient_id: true, full_name: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present.');
    }

    return patient;
  }

  private async ensureMachineExists(machineNumber: number) {
    const machine = await this.prisma.dialysisMachine.findUnique({
      where: { machine_number: machineNumber },
      select: { machine_number: true },
    });

    if (!machine) {
      throw new NotFoundException(
        `Machine number ${machineNumber} does not exist.`,
      );
    }

    return machine;
  }

  private validateNoDuplicateWeekdaysInRequest(
    slots: CreateDialysisScheduleDto['slots'],
  ) {
    const seen = new Set<Weekday>();

    for (const slot of slots) {
      if (seen.has(slot.weekday)) {
        throw new BadRequestException(
          `It is not possible to send more than one slot for the same day within the same order: ${slot.weekday}`,
        );
      }

      seen.add(slot.weekday);
    }
  }

  private async assertNoWeeklyConflict(params: {
    patientId: number;
    weekday: Weekday;
    shiftNumber: number;
    machineNumber: number;
    excludeScheduleId?: number;
  }) {
    const { weekday, shiftNumber, machineNumber, excludeScheduleId } = params;

    const machineConflict = await this.prisma.dialysisSchedule.findFirst({
      where: {
        schedule_id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        weekday,
        shift_number: shiftNumber,
        machine_number: machineNumber,
      },
      select: {
        schedule_id: true,
      },
    });

    if (machineConflict) {
      throw new ConflictException(
        `Machine number ${machineNumber} is already reserved on ${weekday} and shift number ${shiftNumber}.`,
      );
    }
  }

  private async assertNoOtherScheduleForPatientWeekday(params: {
    patientId: number;
    weekday: Weekday;
    excludeScheduleId?: number;
  }) {
    const duplicateWeekday = await this.prisma.dialysisSchedule.findFirst({
      where: {
        patient_id: params.patientId,
        weekday: params.weekday,
        schedule_id: params.excludeScheduleId
          ? { not: params.excludeScheduleId }
          : undefined,
      },
      select: {
        schedule_id: true,
      },
    });

    if (duplicateWeekday) {
      throw new ConflictException(
        `The patient already has another schedule on ${params.weekday}.`,
      );
    }
  }

  private rethrowKnownScheduleErrors(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'The laundry schedule could not be saved due to a conflict with a pre-existing schedule for the same day or the same machine on this shelf.',
      );
    }

    throw error;
  }

  async createSchedule(
    requesterUserId: number,
    dto: CreateDialysisScheduleDto,
  ) {
    const doctor = await this.ensureDepartmentHead(requesterUserId);
    const unitConfig = await this.getDialysisUnitConfig();
    await this.ensurePatientExists(dto.patientId);
    this.validateNoDuplicateWeekdaysInRequest(dto.slots);
    this.assertShiftNumbersAreActive(
      dto.slots.map((slot) => slot.shiftNumber),
      unitConfig.active_shift_count,
    );

    for (const slot of dto.slots) {
      await this.ensureMachineExists(slot.machineNumber);

      const existingForDay = await this.prisma.dialysisSchedule.findFirst({
        where: {
          patient_id: dto.patientId,
          weekday: slot.weekday,
        },
        select: {
          schedule_id: true,
        },
      });

      await this.assertNoWeeklyConflict({
        patientId: dto.patientId,
        weekday: slot.weekday,
        shiftNumber: slot.shiftNumber,
        machineNumber: slot.machineNumber,
        excludeScheduleId: existingForDay?.schedule_id,
      });
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.slots.length === 0) {
          await tx.dialysisSchedule.deleteMany({
            where: {
              patient_id: dto.patientId,
            },
          });

          return [];
        }

        const requestedWeekdays = dto.slots.map((s) => s.weekday);

        await tx.dialysisSchedule.deleteMany({
          where: {
            patient_id: dto.patientId,
            weekday: { notIn: requestedWeekdays },
          },
        });

        const created = await Promise.all(
          dto.slots.map((slot) =>
            tx.dialysisSchedule.upsert({
              where: {
                patient_id_weekday: {
                  patient_id: dto.patientId,
                  weekday: slot.weekday,
                },
              },
              update: {
                created_by_doctor: doctor.doctor_id,
                shift_number: slot.shiftNumber,
                machine_number: slot.machineNumber,
              },
              create: {
                patient_id: dto.patientId,
                created_by_doctor: doctor.doctor_id,
                weekday: slot.weekday,
                shift_number: slot.shiftNumber,
                machine_number: slot.machineNumber,
              },
              include: {
                patient: { select: { patient_id: true, full_name: true } },
                doctor: { select: { doctor_id: true, full_name: true } },
              },
            }),
          ),
        );

        return created;
      });
    } catch (error) {
      this.rethrowKnownScheduleErrors(error);
    }
  }

  async patchSchedule(
    requesterUserId: number,
    scheduleId: number,
    dto: PatchDialysisScheduleDto,
  ) {
    await this.ensureDepartmentHead(requesterUserId);
    const unitConfig = await this.getDialysisUnitConfig();

    const existing = await this.prisma.dialysisSchedule.findUnique({
      where: { schedule_id: scheduleId },
      select: {
        schedule_id: true,
        patient_id: true,
        weekday: true,
        shift_number: true,
        machine_number: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Scheduling does not exist.');
    }

    const nextWeekday = dto.weekday ?? existing.weekday;
    const nextShiftNumber = dto.shiftNumber ?? existing.shift_number;
    const nextMachineNumber = dto.machineNumber ?? existing.machine_number;

    this.assertShiftNumberIsActive(
      nextShiftNumber,
      unitConfig.active_shift_count,
    );
    await this.ensureMachineExists(nextMachineNumber);
    await this.assertNoOtherScheduleForPatientWeekday({
      patientId: existing.patient_id,
      weekday: nextWeekday,
      excludeScheduleId: scheduleId,
    });

    await this.assertNoWeeklyConflict({
      patientId: existing.patient_id,
      weekday: nextWeekday,
      shiftNumber: nextShiftNumber,
      machineNumber: nextMachineNumber,
      excludeScheduleId: scheduleId,
    });

    try {
      return await this.prisma.dialysisSchedule.update({
        where: { schedule_id: scheduleId },
        data: {
          weekday: nextWeekday,
          shift_number: nextShiftNumber,
          machine_number: nextMachineNumber,
        },
        include: {
          patient: { select: { patient_id: true, full_name: true } },
          doctor: { select: { doctor_id: true, full_name: true } },
        },
      });
    } catch (error) {
      this.rethrowKnownScheduleErrors(error);
    }
  }

  async getSchedulesForRequest(params: {
    requesterUserId: number;
    requesterRole: Role;
    patientIdFromQuery?: number;
    weekday?: Weekday;
    shiftNumber?: number;
    machineNumber?: number;
  }) {
    const {
      requesterUserId,
      requesterRole,
      patientIdFromQuery,
      weekday,
      shiftNumber,
      machineNumber,
    } = params;

    const where: Record<string, unknown> = {};

    if (requesterRole === Role.PATIENT) {
      const patientId = await this.getPatientIdByUserId(requesterUserId);
      where.patient_id = patientId;
    } else if (patientIdFromQuery !== undefined) {
      where.patient_id = patientIdFromQuery;
    }

    if (weekday !== undefined) {
      where.weekday = weekday;
    }

    if (shiftNumber !== undefined) {
      where.shift_number = shiftNumber;
    }

    if (machineNumber !== undefined) {
      where.machine_number = machineNumber;
    }

    return this.prisma.dialysisSchedule.findMany({
      where,
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
      },
      orderBy: [
        { weekday: 'asc' },
        { shift_number: 'asc' },
        { machine_number: 'asc' },
      ],
    });
  }

  async getScheduleDetailForRequest(params: {
    requesterUserId: number;
    requesterRole: Role;
    scheduleId: number;
  }) {
    const { requesterUserId, requesterRole, scheduleId } = params;

    if (requesterRole === Role.PATIENT) {
      const patientId = await this.getPatientIdByUserId(requesterUserId);

      const record = await this.prisma.dialysisSchedule.findFirst({
        where: {
          schedule_id: scheduleId,
          patient_id: patientId,
        },
        include: {
          patient: { select: { patient_id: true, full_name: true } },
          doctor: { select: { doctor_id: true, full_name: true } },
        },
      });

      if (!record) {
        throw new NotFoundException('Scheduling does not exist.');
      }

      return record;
    }

    const record = await this.prisma.dialysisSchedule.findFirst({
      where: {
        schedule_id: scheduleId,
      },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        doctor: { select: { doctor_id: true, full_name: true } },
      },
    });

    if (!record) {
      throw new NotFoundException('Scheduling does not exist.');
    }

    return record;
  }

  async listMachinesForScheduling() {
    return this.prisma.dialysisMachine.findMany({
      orderBy: { machine_number: 'asc' },
    });
  }

  async getMachinesSummary() {
    const [machines, unitConfig] = await Promise.all([
      this.prisma.dialysisMachine.findMany({
        orderBy: { machine_number: 'asc' },
      }),
      this.getDialysisUnitConfig(),
    ]);

    const totalMachines = machines.length;

    return {
      totalMachines,
      activeShiftCount: unitConfig.active_shift_count,
      machines,
    };
  }

  async updateTotalMachines(
    requesterUserId: number,
    dto: UpdateTotalMachinesDto,
  ) {
    await this.ensureDepartmentHead(requesterUserId);

    if (dto.totalMachines === undefined && dto.activeShifts === undefined) {
      throw new BadRequestException(
        'At least one setting must be provided: totalMachines or activeShifts.',
      );
    }

    const [currentMachines, unitConfig, schedules] = await Promise.all([
      this.prisma.dialysisMachine.findMany({
        orderBy: { machine_number: 'asc' },
      }),
      this.getDialysisUnitConfig(),
      this.prisma.dialysisSchedule.findMany({
        where: {},
        select: {
          schedule_id: true,
          weekday: true,
          shift_number: true,
          machine_number: true,
        },
        orderBy: [{ weekday: 'asc' }, { shift_number: 'asc' }],
      }),
    ]);

    const nextTotal = dto.totalMachines ?? currentMachines.length;
    const nextActiveShiftCount =
      dto.activeShifts ?? unitConfig.active_shift_count;

    const schedulesOutsideActiveRange = schedules.filter(
      (schedule) => schedule.shift_number > nextActiveShiftCount,
    );

    if (schedulesOutsideActiveRange.length > 0) {
      const blockedShifts = Array.from(
        new Set(
          schedulesOutsideActiveRange.map((schedule) => schedule.shift_number),
        ),
      ).sort((left, right) => left - right);

      throw new ConflictException(
        `Cannot reduce active shifts to ${nextActiveShiftCount} while schedules still exist in shift(s): ${blockedShifts.join(', ')}.`,
      );
    }

    const currentMachineNumbers = new Set(
      currentMachines.map((machine) => machine.machine_number),
    );

    const grouped = new Map<string, typeof schedules>();

    for (const schedule of schedules) {
      const key = `${schedule.weekday}__${schedule.shift_number}`;

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key)!.push(schedule);
    }

    const conflicts: string[] = [];
    const reassignments: Array<{ scheduleId: number; machineNumber: number }> =
      [];

    for (const [key, slotSchedules] of grouped.entries()) {
      const [weekday, shiftNumberText] = key.split('__');
      const shiftNumber = Number(shiftNumberText);

      if (slotSchedules.length > nextTotal) {
        conflicts.push(
          `Today ${weekday} - Shift ${shiftNumber} has ${slotSchedules.length} patients, while the new number of devices is ${nextTotal}.`,
        );
        continue;
      }

      const usedMachines = new Set(slotSchedules.map((s) => s.machine_number));
      const schedulesToReassign = slotSchedules.filter(
        (s) => s.machine_number > nextTotal,
      );

      const availableMachines: number[] = [];
      for (let i = 1; i <= nextTotal; i++) {
        if (!usedMachines.has(i)) {
          availableMachines.push(i);
        }
      }

      schedulesToReassign.forEach((schedule, index) => {
        reassignments.push({
          scheduleId: schedule.schedule_id,
          machineNumber: availableMachines[index],
        });
      });
    }

    if (conflicts.length > 0) {
      throw new ConflictException(
        `Please empty a number of patients from some slots because some slots are full and do not fit the new number of devices.\n${conflicts.join('\n')}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const reassignment of reassignments) {
        await tx.dialysisSchedule.update({
          where: { schedule_id: reassignment.scheduleId },
          data: { machine_number: reassignment.machineNumber },
        });
      }

      const missingMachines: Array<{ machine_number: number }> = [];

      for (let machineNumber = 1; machineNumber <= nextTotal; machineNumber++) {
        if (!currentMachineNumbers.has(machineNumber)) {
          missingMachines.push({ machine_number: machineNumber });
        }
      }

      if (missingMachines.length > 0) {
        await tx.dialysisMachine.createMany({
          data: missingMachines,
          skipDuplicates: true,
        });
      }

      await tx.dialysisMachine.deleteMany({
        where: { machine_number: { gt: nextTotal } },
      });

      const existingConfig = await this.getDialysisUnitConfig(tx);
      await tx.dialysisUnitConfig.update({
        where: { id: existingConfig.id },
        data: {
          active_shift_count: nextActiveShiftCount,
        },
      });

      const machines = await tx.dialysisMachine.findMany({
        orderBy: { machine_number: 'asc' },
      });

      return {
        message: 'The number of devices has been updated successfully.',
        totalMachines: machines.length,
        activeShiftCount: nextActiveShiftCount,
        reassignedSchedules: reassignments.length,
      };
    });
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
  async getTodayForNurse() {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const weekday = this.getWeekdayFromDate(today);
    const unitConfig = await this.getDialysisUnitConfig();

    const schedules = await this.prisma.dialysisSchedule.findMany({
      where: {
        weekday,
      },
      include: {
        patient: {
          select: {
            patient_id: true,
            full_name: true,
          },
        },
      },
      orderBy: [{ shift_number: 'asc' }, { machine_number: 'asc' }],
    });

    const scheduleIds = schedules.map((schedule) => schedule.schedule_id);

    const sessionsToday =
      scheduleIds.length > 0
        ? await this.prisma.dialysisSession.findMany({
            where: {
              schedule_id: { in: scheduleIds },
              date: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            select: {
              session_id: true,
              schedule_id: true,
              status: true,
            },
          })
        : [];

    const sessionByScheduleId = new Map(
      sessionsToday.map((session) => [session.schedule_id, session]),
    );

    const assignmentsToday =
      scheduleIds.length > 0
        ? await this.prisma.scheduleAssignment.findMany({
            where: {
              schedule_id: { in: scheduleIds },
              date: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
            include: { nurse: { select: { full_name: true } } },
          })
        : [];

    const assignmentByScheduleId = new Map(
      assignmentsToday.map((a) => [a.schedule_id, a]),
    );

    const shifts = this.buildShiftNumbers(unitConfig.active_shift_count).map(
      (shiftNumber) => {
        const shiftSchedules = schedules.filter(
          (schedule) => schedule.shift_number === shiftNumber,
        );

        return {
          shiftNumber,
          patientCount: shiftSchedules.length,
          patients: shiftSchedules.map((schedule) => {
            const session = sessionByScheduleId.get(schedule.schedule_id);
            const assignment = assignmentByScheduleId.get(schedule.schedule_id);

            return {
              scheduleId: schedule.schedule_id,
              patientId: schedule.patient_id,
              patientName: schedule.patient.full_name,
              machineNumber: schedule.machine_number,
              hasSessionToday: !!session,
              sessionId: session?.session_id ?? null,
              sessionStatus: session?.status ?? null,
              assignedNurseId: assignment?.nurse_id ?? null,
              assignedNurseName: assignment?.nurse.full_name ?? null,
            };
          }),
        };
      },
    );

    return {
      date: startOfDay.toISOString().split('T')[0],
      weekday,
      activeShiftCount: unitConfig.active_shift_count,
      shifts,
    };
  }

  async getWeeklyOverview(requesterUserId: number, requesterRole: Role) {
    const schedules = await this.prisma.dialysisSchedule.findMany({
      where: {},
      include: {
        patient: {
          select: {
            patient_id: true,
            full_name: true,
          },
        },
      },
      orderBy: [
        { weekday: 'asc' },
        { shift_number: 'asc' },
        { machine_number: 'asc' },
      ],
    });

    const machinesSummary = await this.getMachinesSummary();
    const patientIds = schedules.map((schedule) => schedule.patient_id);
    let unreadMedicalCounts: Record<number, number> = {};
    let unreadRadiologyCounts: Record<number, number> = {};

    if (requesterRole === Role.DOCTOR && patientIds.length > 0) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { user_id: requesterUserId },
        select: { doctor_id: true },
      });

      if (doctor) {
        const [medicalRows, radiologyRows] = await Promise.all([
          this.prisma.medicalTest.findMany({
            where: {
              patient_id: { in: patientIds },
              doctor_id: doctor.doctor_id,
              seen: false,
              date_completed: { not: null },
            },
            select: {
              patient_id: true,
              result: true,
            },
          }),
          this.prisma.radiologyImage.findMany({
            where: {
              patient_id: { in: patientIds },
              doctor_id: doctor.doctor_id,
              seen: false,
              status: RadiologyRequestStatus.COMPLETED,
            },
            select: {
              patient_id: true,
              image_path: true,
            },
          }),
        ]);

        unreadMedicalCounts = medicalRows.reduce<Record<number, number>>(
          (acc, row) => {
            if (!row.result?.trim()) {
              return acc;
            }

            acc[row.patient_id] = (acc[row.patient_id] || 0) + 1;
            return acc;
          },
          {},
        );

        unreadRadiologyCounts = radiologyRows.reduce<Record<number, number>>(
          (acc, row) => {
            if (!row.image_path?.trim()) {
              return acc;
            }

            acc[row.patient_id] = (acc[row.patient_id] || 0) + 1;
            return acc;
          },
          {},
        );
      }
    }

    const data = WEEKDAY_ORDER.map((weekday) => {
      const shifts = this.buildShiftNumbers(
        machinesSummary.activeShiftCount,
      ).map((shiftNumber) => {
        const slotSchedules = schedules.filter(
          (schedule) =>
            schedule.weekday === weekday &&
            schedule.shift_number === shiftNumber,
        );

        return {
          shiftNumber,
          patientCount: slotSchedules.length,
          patients: slotSchedules.map((schedule) => {
            const unreadMedicalResultsCount =
              unreadMedicalCounts[schedule.patient_id] || 0;
            const unreadRadiologyResultsCount =
              unreadRadiologyCounts[schedule.patient_id] || 0;
            const unreadResultsCount =
              unreadMedicalResultsCount + unreadRadiologyResultsCount;

            return {
              patientId: schedule.patient_id,
              patientName: schedule.patient.full_name,
              machineNumber: schedule.machine_number,
              unreadMedicalResultsCount,
              unreadRadiologyResultsCount,
              unreadResultsCount,
              hasUnreadResults: unreadResultsCount > 0,
            };
          }),
        };
      });

      return {
        weekday,
        shifts,
      };
    });

    return {
      totalMachines: machinesSummary.totalMachines,
      activeShiftCount: machinesSummary.activeShiftCount,
      data,
    };
  }

  async assignNurse(requesterUserId: number, dto: AssignNurseDto) {
    const nurse = await this.prisma.nurse.findUnique({
      where: { user_id: requesterUserId },
      select: { nurse_id: true },
    });

    if (!nurse) {
      throw new NotFoundException(
        'There is no nurse profile associated with this account',
      );
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await this.prisma.scheduleAssignment.findFirst({
      where: {
        schedule_id: dto.scheduleId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (existing) {
      throw new ConflictException('This patient is already booked');
    }

    await this.prisma.scheduleAssignment.create({
      data: {
        schedule_id: dto.scheduleId,
        nurse_id: nurse.nurse_id,
        date: startOfDay,
      },
    });

    return { success: true };
  }

  async removeNurseAssignment(requesterUserId: number, scheduleId: number) {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const assignment = await this.prisma.scheduleAssignment.findFirst({
      where: {
        schedule_id: scheduleId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });

    if (!assignment) {
      return { success: true };
    }

    const nurse = await this.prisma.nurse.findUnique({
      where: { user_id: requesterUserId },
      select: { nurse_id: true },
    });

    if (!nurse || assignment.nurse_id !== nurse.nurse_id) {
      throw new ForbiddenException(
        'Only the nurse who made a reservation can cancel his reservation',
      );
    }

    await this.prisma.scheduleAssignment.delete({
      where: { assignment_id: assignment.assignment_id },
    });

    return { success: true };
  }
}
