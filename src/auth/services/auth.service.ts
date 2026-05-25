import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { SetInitialPasswordDto } from '../dto/set-initial-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { PrismaService } from 'src/prisma/PrismaService';
import { EmailService } from 'src/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { doctor: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('The password or user name is incorrect');
    }

    if (!user.canAccess) {
      this.logger.warn(
        `[SECURITY] Login attempt for deactivated user: ${user.username}`,
      );
      throw new ForbiddenException(
        'The account is disabled. Please contact the administration.',
      );
    }

    const payload = {
      sub: user.user_id,
      username: user.username,
      role: user.role,
      mustChangePassword: user.must_change_password,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.must_change_password,
        ...(user.role === Role.DOCTOR && {
          isHead: user.doctor?.isHead ?? false,
        }),
      },
    };
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{
    message: string;
    access_token: string;
    user: {
      id: number;
      username: string;
      role: Role;
      mustChangePassword: boolean;
      isHead?: boolean;
    };
  }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(
        'The new password must be different from the current password',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(
      dto.oldPassword,
      user.password,
    );
    if (!isOldPasswordValid) {
      throw new BadRequestException('The current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    const updatedUser = await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        password: hashedNewPassword,
        must_change_password: false,
      },
      include: { doctor: true },
    });

    const payload = {
      sub: updatedUser.user_id,
      username: updatedUser.username,
      role: updatedUser.role,
      mustChangePassword: false,
    };

    this.logger.log(`[SECURITY] Password changed for user ID: ${userId}`);
    return {
      message:
        'The password has been changed successfully. Please use the new password on your next login.',
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: updatedUser.user_id,
        username: updatedUser.username,
        role: updatedUser.role,
        mustChangePassword: false,
        ...(updatedUser.role === Role.DOCTOR && {
          isHead: updatedUser.doctor?.isHead ?? false,
        }),
      },
    };
  }

  async setInitialPassword(
    userId: number,
    dto: SetInitialPasswordDto,
  ): Promise<{
    message: string;
    access_token: string;
    user: {
      id: number;
      username: string;
      role: Role;
      mustChangePassword: boolean;
      isHead?: boolean;
    };
  }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('The two new passwords do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.must_change_password) {
      throw new BadRequestException(
        'This procedure can only be used for accounts that still use a temporary password.',
      );
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    const updatedUser = await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        password: hashedNewPassword,
        must_change_password: false,
      },
      include: { doctor: true },
    });

    const payload = {
      sub: updatedUser.user_id,
      username: updatedUser.username,
      role: updatedUser.role,
      mustChangePassword: false,
    };

    return {
      message: 'The new password has been set successfully.',
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: updatedUser.user_id,
        username: updatedUser.username,
        role: updatedUser.role,
        mustChangePassword: false,
        ...(updatedUser.role === Role.DOCTOR && {
          isHead: updatedUser.doctor?.isHead ?? false,
        }),
      },
    };
  }
  async skipInitialPasswordChange(userId: number): Promise<{
    message: string;
    access_token: string;
    user: {
      id: number;
      username: string;
      role: Role;
      mustChangePassword: boolean;
      isHead?: boolean;
    };
  }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { user_id: userId },
      include: { doctor: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = existingUser.must_change_password
      ? await this.prisma.user.update({
          where: { user_id: userId },
          data: { must_change_password: false },
          include: { doctor: true },
        })
      : existingUser;

    const payload = {
      sub: updatedUser.user_id,
      username: updatedUser.username,
      role: updatedUser.role,
      mustChangePassword: false,
    };

    return {
      message:
        'The password change was successfully skipped, and you can change it later from your profile.',
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: updatedUser.user_id,
        username: updatedUser.username,
        role: updatedUser.role,
        mustChangePassword: false,
        ...(updatedUser.role === Role.DOCTOR && {
          isHead: updatedUser.doctor?.isHead ?? false,
        }),
      },
    };
  }
  async requestPasswordReset(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const email = dto.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email required');

    const [
      doctor,
      nurse,
      specialist,
      radiologist,
      nutritionist,
      pharmacist,
      patient,
    ] = await Promise.all([
      this.prisma.doctor.findFirst({
        where: { email },
        include: { user: true },
      }),
      this.prisma.nurse.findFirst({
        where: { email },
        include: { user: true },
      }),
      this.prisma.labSpecialist.findFirst({
        where: { email },
        include: { user: true },
      }),
      this.prisma.radiologist.findFirst({
        where: { email },
        include: { user: true },
      }),
      this.prisma.nutritionist.findFirst({
        where: { email },
        include: { user: true },
      }),
      this.prisma.pharmacist.findFirst({
        where: { email },
        include: { user: true },
      }),
      this.prisma.patient.findFirst({
        where: { email },
        include: { user: true },
      }),
    ]);

    const user =
      doctor?.user ||
      nurse?.user ||
      specialist?.user ||
      radiologist?.user ||
      nutritionist?.user ||
      pharmacist?.user ||
      patient?.user;

    if (!user) throw new NotFoundException('User not found');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.passwordReset.upsert({
      where: { user_id: user.user_id },
      create: {
        user_id: user.user_id,
        email,
        otp_code: otp,
        expires_at: expiresAt,
      },
      update: { otp_code: otp, expires_at: expiresAt, is_verified: false },
    });

    try {
      await this.emailService.sendOtpEmail(email, otp);
    } catch (error) {
      await this.prisma.passwordReset.deleteMany({
        where: { user_id: user.user_id },
      });
      this.logger.error(
        `Failed to deliver password reset OTP for user ${user.user_id}`,
      );
      throw error;
    }

    return {
      message:
        'Verification code sent successfully. Please use the code provided in the next window.',
    };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
  ): Promise<{ message: string; token: string }> {
    const email = dto.email?.trim().toLowerCase();
    const { otp } = dto;
    if (!email) throw new BadRequestException('Email required');

    const passwordReset = await this.prisma.passwordReset.findFirst({
      where: { email },
    });

    if (!passwordReset) throw new NotFoundException('User not found');
    if (new Date() > passwordReset.expires_at)
      throw new BadRequestException(
        'The code has expired, please request a new code',
      );
    if (passwordReset.otp_code !== otp)
      throw new UnauthorizedException('The code is incorrect');

    await this.prisma.passwordReset.update({
      where: { user_id: passwordReset.user_id },
      data: { is_verified: true },
    });

    const resetToken = await this.jwtService.signAsync(
      { sub: passwordReset.user_id, purpose: 'password-reset' },
      { expiresIn: '10m' },
    );

    return {
      message: 'The code has been verified successfully',
      token: resetToken,
    };
  }

  async resetPassword(
    resetToken: string,
    dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword)
      throw new BadRequestException('Passwords do not match');

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        purpose: string;
      }>(resetToken);
      if (payload.purpose !== 'password-reset')
        throw new UnauthorizedException('The verification code is invalid');

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { user_id: payload.sub },
        data: {
          password: hashedPassword,
          must_change_password: false,
        },
      });

      await this.prisma.passwordReset.deleteMany({
        where: { user_id: payload.sub },
      });

      return {
        message:
          'The password has been changed successfully. Please use the new password on your next login.',
      };
    } catch {
      throw new UnauthorizedException(
        'The verification code has expired, please request a new one',
      );
    }
  }

  async changePatientPasswordByStaff(
    dto: { patientId: number; newPassword: string },
    requesterRole: Role,
    requesterId: number,
  ): Promise<{ message: string }> {
    const { patientId, newPassword } = dto;

    if (requesterRole === Role.DOCTOR) {
      const headDoc = await this.prisma.doctor.findUnique({
        where: { user_id: requesterId },
      });
      if (!headDoc?.isHead) {
        throw new ForbiddenException(
          'Whenever you are a non-principal doctor, you cannot change the patients password. Please contact your primary physician or administration to change your password.',
        );
      }
    } else if (requesterRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'Whenever you are a non-principal doctor, you cannot change the patients password. Please contact your primary physician or administration to change your password.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { user_id: patientId },
    });
    if (!targetUser) throw new NotFoundException(`User not found`);
    if (targetUser.role !== Role.PATIENT)
      throw new BadRequestException(`This user is not sick`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { user_id: patientId },
      data: { password: hashedPassword },
    });

    this.logger.warn(
      `[SECURITY] Patient (ID: ${patientId}) password changed by staff (Role: ${requesterRole})`,
    );

    return {
      message:
        'The password has been changed successfully. Please use the new password on your next login.',
    };
  }
}
