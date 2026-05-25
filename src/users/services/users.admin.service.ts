import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { CreateUserDto } from '../dto/create-user.dto';
import { EmailService } from 'src/mail/mail.service';

@Injectable()
export class UsersAdminService {
  private readonly logger = new Logger(UsersAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private safeString(val: unknown): string {
    return typeof val === 'string' ? val.trim() : '';
  }

  private optionalString(val: unknown): string | null {
    const trimmed = this.safeString(val);
    return trimmed.length > 0 ? trimmed : null;
  }

  private requiredString(val: unknown, fieldLabel: string): string {
    const normalized = this.safeString(val);
    if (!normalized) {
      throw new BadRequestException(`${fieldLabel} is required`);
    }
    return normalized;
  }

  private normalizeEmail(val: unknown): string {
    return this.requiredString(val, 'e-mail').toLowerCase();
  }

  private optionalEmail(val: unknown): string | null {
    const trimmed = this.safeString(val);
    if (!trimmed) {
      return null;
    }
    return trimmed.toLowerCase();
  }

  private pickRandomCharacter(characters: string): string {
    return characters[randomInt(0, characters.length)] ?? characters[0];
  }

  private generateTemporaryPassword(length = 12): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*';
    const all = `${upper}${lower}${digits}${symbols}`;

    const passwordCharacters = [
      this.pickRandomCharacter(upper),
      this.pickRandomCharacter(lower),
      this.pickRandomCharacter(digits),
      this.pickRandomCharacter(symbols),
    ];

    while (passwordCharacters.length < length) {
      passwordCharacters.push(this.pickRandomCharacter(all));
    }

    for (let i = passwordCharacters.length - 1; i > 0; i -= 1) {
      const j = randomInt(0, i + 1);
      [passwordCharacters[i], passwordCharacters[j]] = [
        passwordCharacters[j],
        passwordCharacters[i],
      ];
    }

    return passwordCharacters.join('');
  }

  private deriveUsername(role: Role, details: Record<string, unknown>): string {
    if (role === Role.PATIENT) {
      return this.requiredString(details['national_id'], 'National number');
    }

    return this.normalizeEmail(details['email']);
  }

  async createUser(
    dto: CreateUserDto,
    requesterUserId: number,
    requesterRole: Role,
  ) {
    if (!dto.details) {
      throw new BadRequestException('User details are required');
    }

    const details = dto.details as unknown as Record<string, unknown>;
    const username = this.deriveUsername(dto.role, details);
    const temporaryPassword = this.generateTemporaryPassword();

    await this.validateCreationPermissions(
      requesterUserId,
      requesterRole,
      dto.role,
      details,
    );

    const existing = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existing) {
      throw new ConflictException('The username is already in use');
    }

    const hashed = await bcrypt.hash(temporaryPassword, 10);

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            username,
            password: hashed,
            role: dto.role,
            must_change_password: true,
            created_by_id: requesterUserId,
          },
        });

        await this.createRoleDetails(tx, user.user_id, dto.role, details);
        const { password, ...safeUser } = user;

        return {
          user: safeUser,
          username,
          temporaryPassword,
        };
      },
    );

    const {
      username: createdUsername,
      temporaryPassword: createdPassword,
      user: safeUser,
    } = result;

    if (dto.role !== Role.PATIENT) {
      const fullName = this.requiredString(details['full_name'], 'full name');
      const email = this.normalizeEmail(details['email']);

      try {
        await this.emailService.sendTemporaryPasswordEmail(
          email,
          fullName,
          createdUsername,
          createdPassword,
          dto.role,
        );

        return {
          user: safeUser,
          emailDelivered: true,
          message:
            'The account has been created successfully and the password has been sent to the email',
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown email failure';
        this.logger.error(
          `Staff account created for ${email}, but credential delivery failed: ${message}`,
        );

        return {
          user: safeUser,
          emailDelivered: false,
          message:
            'The account was created, but the email could not be sent. Manually submit the following login information to the user.',
          generatedCredentials: {
            username: createdUsername,
            password: createdPassword,
          },
        };
      }
    }

    // For the patient: Return the password as before
    return {
      user: safeUser,
      generatedCredentials: {
        username: createdUsername,
        password: createdPassword,
      },
    };
  }

  async toggleUserAccess(
    userId: number,
    requesterId: number,
    requesterRole: Role,
  ) {
    const targetUser = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });
    if (!targetUser) {
      throw new NotFoundException(
        `The user you are looking for does not exist`,
      );
    }

    await this.validateTogglePermissions(
      requesterId,
      requesterRole,
      targetUser.user_id,
      targetUser.role,
      targetUser.created_by_id,
    );

    const updatedUser = await this.prisma.user.update({
      where: { user_id: userId },
      data: { canAccess: !targetUser.canAccess },
    });

    const action = updatedUser.canAccess ? 'an act' : 'Disabled';
    this.logger.warn(
      `[SECURITY] User ${targetUser.username} was ${action}d by ${requesterRole} ID:${requesterId}`,
    );

    return {
      message: `${action} successfully accessed user ${targetUser.username}.`,
      canAccess: updatedUser.canAccess,
    };
  }

  private async validateCreationPermissions(
    reqId: number,
    reqRole: Role,
    targetRole: Role,
    details: Record<string, unknown>,
  ) {
    if (reqRole === Role.ADMIN) {
      const allowedRoles: Role[] = [
        Role.DOCTOR,
        Role.PHARMACIST,
        Role.RADIOLOGIST,
        Role.LAB_TECH,
        Role.NUTRITIONIST,
      ];
      if (!allowedRoles.includes(targetRole)) {
        throw new ForbiddenException('ADMİN may not create this type of user');
      }
      if (targetRole === Role.DOCTOR && details['isHead'] !== true) {
        throw new BadRequestException(
          'The responsible physician must be the head of the department',
        );
      }
      return;
    }

    if (reqRole === Role.DOCTOR) {
      const doc = await this.prisma.doctor.findUnique({
        where: { user_id: reqId },
      });
      if (!doc?.isHead) {
        throw new ForbiddenException(
          'Whenever you are a non-principal doctor, you cannot create users. Please contact your primary physician or department to create users.',
        );
      }
      const allowedRoles: Role[] = [Role.DOCTOR, Role.NURSE, Role.PATIENT];
      if (!allowedRoles.includes(targetRole)) {
        throw new ForbiddenException(
          'The powers allowed to a non-principal doctor are: doctor, nurse, patient',
        );
      }
      if (targetRole === Role.DOCTOR && details['isHead'] === true) {
        throw new ForbiddenException(
          'You cannot create a master doctor through this interface',
        );
      }
      return;
    }

    throw new ForbiddenException('You are not allowed to create new users');
  }

  private async validateTogglePermissions(
    reqId: number,
    reqRole: Role,
    tUserId: number,
    tRole: Role,
    tCreatedBy: number | null,
  ) {
    if (reqRole === Role.ADMIN) {
      if (tRole === Role.ADMIN && tUserId !== reqId) {
        throw new ForbiddenException('ADMİN may not create this type of user');
      }
      return;
    }
    if (reqRole === Role.DOCTOR) {
      const head = await this.prisma.doctor.findUnique({
        where: { user_id: reqId },
      });
      if (!head?.isHead) {
        throw new ForbiddenException(
          'Whenever you are a non-principal doctor, you cannot create users. Please contact your primary physician or department to create users.',
        );
      }
      if (tCreatedBy !== reqId) {
        throw new ForbiddenException(
          'Whenever you are a non-principal doctor, you cannot enable or disable users you did not create. Please contact your primary physician or management to manage users.',
        );
      }
      return;
    }
    throw new ForbiddenException(
      'You are not allowed to modify the access status of users.',
    );
  }

  private async createRoleDetails(
    tx: Prisma.TransactionClient,
    userId: number,
    role: Role,
    details: Record<string, unknown>,
  ) {
    const commonBase = {
      user_id: userId,
      full_name: this.requiredString(details['full_name'], 'full name'),
      national_id: this.requiredString(
        details['national_id'],
        'National number',
      ),
      phone: this.requiredString(details['phone'], 'phone number'),
    };

    switch (role) {
      case Role.DOCTOR:
        await tx.doctor.create({
          data: {
            ...commonBase,
            email: this.normalizeEmail(details['email']),
            specialty: this.requiredString(
              details['specialty'],
              'Specialization',
            ),
            isHead: details['isHead'] === true,
          },
        });
        break;
      case Role.NURSE:
        await tx.nurse.create({
          data: {
            ...commonBase,
            email: this.normalizeEmail(details['email']),
          },
        });
        break;
      case Role.PATIENT:
        await tx.patient.create({
          data: {
            ...commonBase,
            email: this.optionalEmail(details['email']),
            gender: this.requiredString(details['gender'], 'Sex'),
            birth_date: new Date(
              this.requiredString(details['birth_date'], 'date of birth'),
            ),
            emergency_contact: this.requiredString(
              details['emergency_contact'],
              'Emergency contact number',
            ),
            blood_type: this.optionalString(details['blood_type']),
            chronic_diseases: this.optionalString(details['chronic_diseases']),
            allergies: this.optionalString(details['allergies']),
            medical_history_notes: this.optionalString(
              details['medical_history_notes'],
            ),
            smoking_status: details['smoking_status'] === true,
            notes: this.optionalString(details['notes']),
          },
        });
        break;
      case Role.PHARMACIST:
        await tx.pharmacist.create({
          data: {
            ...commonBase,
            email: this.normalizeEmail(details['email']),
          },
        });
        break;
      case Role.LAB_TECH:
        await tx.labSpecialist.create({
          data: {
            ...commonBase,
            email: this.normalizeEmail(details['email']),
          },
        });
        break;
      case Role.RADIOLOGIST:
        await tx.radiologist.create({
          data: {
            ...commonBase,
            email: this.normalizeEmail(details['email']),
          },
        });
        break;
      case Role.NUTRITIONIST:
        await tx.nutritionist.create({
          data: {
            ...commonBase,
            email: this.normalizeEmail(details['email']),
          },
        });
        break;
    }
  }
}
