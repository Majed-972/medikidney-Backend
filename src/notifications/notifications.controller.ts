import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiBody } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import type { RequestWithUser } from 'src/auth/interfaces/request-with-user.interface';
import { NotificationsService } from './notifications.service';
import { PrismaService } from 'src/prisma/PrismaService';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Register device token from the app*/
  @Post('register-device')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary:
      'Register a new device token to receive notifications (executed when the application is opened)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceToken: { type: 'string', example: 'ExponentPushToken[...]' },
        deviceName: { type: 'string', example: 'iPhone 13' },
      },
      required: ['deviceToken'],
    },
  })
  async registerDevice(
    @Req() req: RequestWithUser,
    @Body() body: { deviceToken: string; deviceName?: string },
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: req.user.userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    return this.notificationsService.registerDeviceToken(
      patient.patient_id,
      body.deviceToken,
      body.deviceName,
    );
  }

  /**
   * Get unread notifications*/
  @Get('unread')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Get unread notifications',
  })
  async getUnreadNotifications(@Req() req: RequestWithUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: req.user.userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    return this.notificationsService.getUnreadNotifications(patient.patient_id);
  }

  /**
   * Get all notifications*/
  @Get('all')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Get all notifications',
  })
  async getAllNotifications(@Req() req: RequestWithUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: req.user.userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    return this.notificationsService.getAllNotifications(patient.patient_id);
  }

  /**
   * Get the number of unread notifications*/
  @Get('unread-count')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Get the number of unread notifications',
  })
  async getUnreadCount(@Req() req: RequestWithUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: req.user.userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    const count = await this.notificationsService.getUnreadCount(
      patient.patient_id,
    );
    return { unreadCount: count };
  }

  /**
   * Mark one notification as read*/
  @Patch(':notificationId/read')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Mark a notification as read',
  })
  async markAsRead(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Req() req: RequestWithUser,
  ) {
    // Verify that the notification is for this patient
    const notification = await this.prisma.notificationLog.findUnique({
      where: { notification_id: notificationId },
      select: { patient_id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { user_id: req.user.userId },
      select: { patient_id: true },
    });

    if (!patient || notification.patient_id !== patient.patient_id) {
      throw new NotFoundException(
        'You do not have permission to access this notice',
      );
    }

    return this.notificationsService.markAsRead(notificationId);
  }

  /**
   * Mark all notifications as read*/
  @Patch('mark-all-read')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Mark all notifications as read',
  })
  async markAllAsRead(@Req() req: RequestWithUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: req.user.userId },
      select: { patient_id: true },
    });

    if (!patient) {
      throw new NotFoundException('The patient is not present');
    }

    return this.notificationsService.markAllAsRead(patient.patient_id);
  }

  /**
   * Delete notification*/
  @Patch(':notificationId/delete')
  @Roles(Role.PATIENT)
  @ApiOperation({
    summary: 'Delete a notification',
  })
  async deleteNotification(
    @Param('notificationId', ParseIntPipe) notificationId: number,
    @Req() req: RequestWithUser,
  ) {
    // Verify that the notification is for this patient
    const notification = await this.prisma.notificationLog.findUnique({
      where: { notification_id: notificationId },
      select: { patient_id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { user_id: req.user.userId },
      select: { patient_id: true },
    });

    if (!patient || notification.patient_id !== patient.patient_id) {
      throw new NotFoundException(
        'You do not have permission to access this notice',
      );
    }

    return this.notificationsService.deleteNotification(notificationId);
  }
}
