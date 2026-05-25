import {
  Body,
  Controller,
  Post,
  UseGuards,
  Patch,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { SetInitialPasswordDto } from '../dto/set-initial-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePatientPasswordDto } from '../dto/change-patient-password.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Log in and get JWT' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the password for the current user' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authService.changePassword(req.user.userId, dto);
  }
  @UseGuards(JwtAuthGuard)
  @Patch('set-initial-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set a new password upon first login' })
  async setInitialPassword(
    @Body() dto: SetInitialPasswordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authService.setInitialPassword(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('skip-initial-password-change')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Skip the initial password change request for new users (administrators and doctors only)',
  })
  async skipInitialPasswordChange(@Req() req: RequestWithUser) {
    return this.authService.skipInitialPasswordChange(req.user.userId);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Password reset request',
  })
  @ApiResponse({
    status: 200,
    description: 'A password reset request has been sent',
  })
  @ApiResponse({
    status: 400,
    description: 'Email is incorrect',
  })
  @ApiResponse({
    status: 403,
    description:
      'Access to password reset request is not permitted (eg if email is not registered)',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP code',
  })
  @ApiResponse({
    status: 200,
    description: 'Verified, you can now set a new password',
  })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }
  @Post('reset-password')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset password',
  })
  async resetPassword(@Req() req: Request, @Body() dto: ResetPasswordDto) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      throw new UnauthorizedException(
        'A power of attorney for identity verification must be provided in the application header',
      );

    const token = authHeader.split(' ')[1];
    if (!token)
      throw new UnauthorizedException(
        'A power of attorney for identity verification must be provided in the application header',
      );

    return this.authService.resetPassword(token, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DOCTOR)
  @ApiBearerAuth()
  @Post('change-patient-password')
  @ApiOperation({
    summary: 'Change patient password (administrators and doctors only)',
  })
  async changePatientPassword(
    @Body() dto: ChangePatientPasswordDto,
    @Req() req: RequestWithUser,
  ) {
    return this.authService.changePatientPasswordByStaff(
      dto,
      req.user.role,
      req.user.userId,
    );
  }
}
