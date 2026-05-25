import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateNutritionProgramDto } from './dto/create-nutrition-program.dto';
import { UpdateNutritionProgramDto } from './dto/update-nutrition-program.dto';

@Injectable()
export class NutritionProgramService {
  constructor(private readonly prisma: PrismaService) {}

  private async getNutritionistIdByUserId(userId: number) {
    const nutritionist = await this.prisma.nutritionist.findUnique({
      where: { user_id: userId },
      select: { nutritionist_id: true },
    });

    if (!nutritionist) {
      throw new ForbiddenException(
        'The process can only be carried out via an account linked to the data of a nutritionist.',
      );
    }

    return nutritionist.nutritionist_id;
  }

  private async ensureNutritionistExists(nutritionistId: number) {
    const nutritionist = await this.prisma.nutritionist.findUnique({
      where: { nutritionist_id: nutritionistId },
      select: { nutritionist_id: true },
    });

    if (!nutritionist) {
      throw new NotFoundException('Nutritionist not available.');
    }

    return nutritionist.nutritionist_id;
  }

  private async getPatientIdByUserId(userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('No patient data was found for this user');
    }

    return patient.patient_id;
  }

  async createProgram(
    requesterUserId: number,
    requesterRole: Role,
    dto: CreateNutritionProgramDto,
  ) {
    const nutritionistId =
      requesterRole === Role.NUTRITIONIST
        ? await this.getNutritionistIdByUserId(requesterUserId)
        : dto.nutritionistId
          ? await this.ensureNutritionistExists(dto.nutritionistId)
          : (() => {
              throw new BadRequestException(
                'When creating a program with DOCTOR you must pass nutritionistId in body.',
              );
            })();

    const patient = await this.prisma.patient.findUnique({
      where: { patient_id: dto.patientId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present.');
    }

    return this.prisma.nutritionProgram.create({
      data: {
        patient_id: dto.patientId,
        nutritionist_id: nutritionistId,
        title: dto.title,
        description: dto.description ?? null,
        allowed_items: dto.allowedItems ?? null,
        forbidden_items: dto.forbiddenItems ?? null,
        breakfast: dto.breakfast ?? null,
        lunch: dto.lunch ?? null,
        dinner: dto.dinner ?? null,
        meal_notes: dto.mealNotes ?? null,
        start_date: new Date(dto.startDate),
        end_date: dto.endDate ? new Date(dto.endDate) : null,
      },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        nutritionist: { select: { nutritionist_id: true, full_name: true } },
      },
    });
  }

  async updateProgram(
    requesterUserId: number,
    requesterRole: Role,
    programId: number,
    dto: UpdateNutritionProgramDto,
  ) {
    const nutritionistId =
      requesterRole === Role.NUTRITIONIST
        ? await this.getNutritionistIdByUserId(requesterUserId)
        : dto.nutritionistId
          ? await this.ensureNutritionistExists(dto.nutritionistId)
          : (() => {
              return null;
            })();

    const existing = await this.prisma.nutritionProgram.findUnique({
      where: { program_id: programId },
      select: { program_id: true },
    });

    if (!existing) {
      throw new NotFoundException('Nutrition program does not exist.');
    }

    let patientId = dto.patientId;
    if (patientId !== undefined) {
      const patient = await this.prisma.patient.findUnique({
        where: { patient_id: patientId },
        select: { patient_id: true },
      });
      if (!patient) {
        throw new NotFoundException('The specified patient does not exist.');
      }
    } else {
      const current = await this.prisma.nutritionProgram.findUnique({
        where: { program_id: programId },
        select: { patient_id: true },
      });
      if (!current) {
        throw new NotFoundException('Nutrition program does not exist.');
      }
      patientId = current.patient_id;
    }

    if (dto.title !== undefined && dto.title.trim().length < 2) {
      throw new BadRequestException('The program title is invalid.');
    }

    const finalNutritionistId =
      nutritionistId === null
        ? (
            await this.prisma.nutritionProgram.findUnique({
              where: { program_id: programId },
              select: { nutritionist_id: true },
            })
          )?.nutritionist_id
        : nutritionistId;

    if (!finalNutritionistId) {
      throw new NotFoundException(
        'A nutritionist cannot be identified for this process.',
      );
    }

    return this.prisma.nutritionProgram.update({
      where: { program_id: programId },
      data: {
        patient_id: patientId,
        nutritionist_id: finalNutritionistId,
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        allowed_items: dto.allowedItems ?? undefined,
        forbidden_items: dto.forbiddenItems ?? undefined,
        breakfast: dto.breakfast ?? undefined,
        lunch: dto.lunch ?? undefined,
        dinner: dto.dinner ?? undefined,
        meal_notes: dto.mealNotes ?? undefined,
        start_date: dto.startDate ? new Date(dto.startDate) : undefined,
        end_date: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        nutritionist: { select: { nutritionist_id: true, full_name: true } },
      },
    });
  }

  async getProgramDetailForRequest(
    requesterUserId: number,
    requesterRole: Role,
    programId: number,
  ) {
    if (requesterRole === Role.PATIENT) {
      const program = await this.prisma.nutritionProgram.findFirst({
        where: {
          program_id: programId,
          patient: { user_id: requesterUserId },
        },
        include: {
          patient: { select: { patient_id: true, full_name: true } },
          nutritionist: { select: { nutritionist_id: true, full_name: true } },
        },
      });

      if (!program) {
        throw new NotFoundException('No nutrition program found');
      }

      return program;
    }

    const program = await this.prisma.nutritionProgram.findUnique({
      where: { program_id: programId },
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        nutritionist: { select: { nutritionist_id: true, full_name: true } },
      },
    });

    if (!program) {
      throw new NotFoundException('No nutrition program found');
    }

    return program;
  }

  async getProgramsForRequest(
    requesterUserId: number,
    requesterRole: Role,
    patientIdFromQuery?: number,
  ) {
    if (requesterRole === Role.PATIENT) {
      const patientId = await this.getPatientIdByUserId(requesterUserId);
      return this.prisma.nutritionProgram.findMany({
        where: { patient_id: patientId },
        include: {
          patient: { select: { patient_id: true, full_name: true } },
          nutritionist: { select: { nutritionist_id: true, full_name: true } },
        },
        orderBy: { start_date: 'desc' },
      });
    }

    const where =
      patientIdFromQuery !== undefined
        ? { patient_id: patientIdFromQuery }
        : undefined;

    return this.prisma.nutritionProgram.findMany({
      where,
      include: {
        patient: { select: { patient_id: true, full_name: true } },
        nutritionist: { select: { nutritionist_id: true, full_name: true } },
      },
      orderBy: { start_date: 'desc' },
    });
  }
}
