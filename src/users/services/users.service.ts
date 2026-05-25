import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/PrismaService';
import { Role } from '@prisma/client';
import { UpdateProfileDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeOptionalString(value?: string | null) {
    if (typeof value !== 'string') {
      return value ?? undefined;
    }

    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }

  private normalizeEmail(value?: string | null) {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim().toLowerCase();
    return trimmed === '' ? undefined : trimmed;
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: id },
      include: {
        doctor: true,
        patient: true,
        nurse: true,
        labTech: true,
        pharmacist: true,
        nutritionist: true,
        radTech: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...result } = user;
    return result;
  }

  async updateProfile(userId: number, role: Role, dto: UpdateProfileDto) {
    const roleMapping: Partial<Record<Role, string>> = {
      [Role.ADMIN]: 'admin',
      [Role.DOCTOR]: 'doctor',
      [Role.PATIENT]: 'patient',
      [Role.NURSE]: 'nurse',
      [Role.LAB_TECH]: 'labTech',
      [Role.PHARMACIST]: 'pharmacist',
      [Role.NUTRITIONIST]: 'nutritionist',
      [Role.RADIOLOGIST]: 'radTech',
    };

    const relationField = roleMapping[role];

    if (!relationField) {
      throw new NotFoundException('User role is not supported for updating');
    }

    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: { [relationField]: true },
    });

    if (!user || !user[relationField]) {
      throw new NotFoundException('Profile data could not be found');
    }

    const normalizedEmail =
      role !== Role.PATIENT ? this.normalizeEmail(dto.email) : undefined;

    if (normalizedEmail && normalizedEmail !== user.username) {
      const conflictingUser = await this.prisma.user.findFirst({
        where: {
          username: normalizedEmail,
          NOT: { user_id: userId },
        },
        select: { user_id: true },
      });

      if (conflictingUser) {
        throw new ConflictException(
          'The email is already in use by another user',
        );
      }
    }

    const relationUpdate = {
      ...dto,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
    };

    return this.prisma.user.update({
      where: { user_id: userId },
      data: {
        ...(normalizedEmail ? { username: normalizedEmail } : {}),
        [relationField]: {
          update: relationUpdate,
        },
      },
      include: { [relationField]: true },
    });
  }
  async searchPatientsByName(name: string) {
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.PATIENT,
        canAccess: true,
        patient: {
          full_name: {
            contains: name,
            mode: 'insensitive',
          },
        },
      },
      select: {
        user_id: true,
        patient: {
          select: {
            full_name: true,
          },
        },
      },
    });

    return users.map((user) => ({
      id: user.user_id,
      name: user.patient?.full_name,
    }));
  }

  async getPatientProfileByUserId(userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    return patient;
  }

  async updatePatientMedicalProfileByUserId(
    userId: number,
    dto: UpdateProfileDto,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    return this.prisma.patient.update({
      where: { user_id: userId },
      data: {
        blood_type: this.normalizeOptionalString(dto.blood_type),
        chronic_diseases: this.normalizeOptionalString(dto.chronic_diseases),
        allergies: this.normalizeOptionalString(dto.allergies),
        medical_history_notes: this.normalizeOptionalString(
          dto.medical_history_notes,
        ),
        smoking_status:
          typeof dto.smoking_status === 'boolean'
            ? dto.smoking_status
            : undefined,
        notes: this.normalizeOptionalString(dto.notes),
      },
      include: {
        user: {
          select: {
            user_id: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }
}
