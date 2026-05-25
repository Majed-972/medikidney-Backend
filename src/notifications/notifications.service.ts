import { Injectable, Logger } from '@nestjs/common';
import * as Expo from 'expo-server-sdk';
import { PrismaService } from 'src/prisma/PrismaService';

@Injectable()
export class NotificationsService {
  private expoClient: Expo.Expo;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {
    this.expoClient = new Expo.Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN || '',
    });
  }

  /**
   * Send notification to the patient*/
  async sendNotificationToPatient(
    patientId: number,
    title: string,
    message: string,
    notificationType: string,
    relatedId?: number,
  ) {
    try {
      // 1. Get all active patient's device tokens
      const deviceTokens = await this.prisma.patientDeviceToken.findMany({
        where: {
          patient_id: patientId,
          is_active: true,
        },
        select: { device_token: true },
      });

      if (deviceTokens.length === 0) {
        this.logger.warn(`No active patient warning devices ${patientId}`);
        return null;
      }

      // 2. Save to database
      await this.prisma.notificationLog.create({
        data: {
          patient_id: patientId,
          notification_type: notificationType,
          title,
          message,
          related_id: relatedId,
        },
      });

      // 3. Filter tokens are valid
      const validTokens = deviceTokens.filter((token) =>
        Expo.Expo.isExpoPushToken(token.device_token),
      );

      if (validTokens.length === 0) {
        this.logger.warn(
          `There are no valid Expo tokens for the patient ${patientId}`,
        );
        return null;
      }

      // 4. Prepare messages
      const messages = validTokens.map((token) => ({
        to: token.device_token,
        sound: 'default' as const,
        title,
        body: message,
        data: {
          notificationType,
          relatedId: relatedId?.toString() || '',
        },
      }));

      // 5. Send via Expo
      const tickets = await this.expoClient.sendPushNotificationsAsync(
        messages as Expo.ExpoPushMessage[],
      );

      this.logger.log(
        `${tickets.length} notification sent to patient ${patientId}`,
      );
      return { success: true, ticketsCount: tickets.length };
    } catch (error) {
      this.logger.error(
        `Error sending notification to patient ${patientId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Register a new device token*/
  async registerDeviceToken(
    patientId: number,
    deviceToken: string,
    deviceName?: string,
  ) {
    try {
      // Validate token format
      if (!Expo.Expo.isExpoPushToken(deviceToken)) {
        this.logger.warn(
          `Device token is invalid for patient ${patientId}: ${deviceToken as string}`,
        );
      }

      return this.prisma.patientDeviceToken.upsert({
        where: { device_token: deviceToken },
        update: {
          is_active: true,
          updated_at: new Date(),
        },
        create: {
          patient_id: patientId,
          device_token: deviceToken,
          device_name: deviceName,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error registering device token for patient ${patientId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get unread notifications*/
  async getUnreadNotifications(patientId: number, limit = 50) {
    try {
      return this.prisma.notificationLog.findMany({
        where: {
          patient_id: patientId,
          is_read: false,
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(
        `Error fetching unread notifications for patient ${patientId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all notifications*/
  async getAllNotifications(patientId: number, limit = 100) {
    try {
      return this.prisma.notificationLog.findMany({
        where: { patient_id: patientId },
        orderBy: { created_at: 'desc' },
        take: limit,
      });
    } catch (error) {
      this.logger.error(
        `Error fetching all notifications for patient ${patientId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Drag a notification as read*/
  async markAsRead(notificationId: number) {
    try {
      return this.prisma.notificationLog.update({
        where: { notification_id: notificationId },
        data: { is_read: true },
      });
    } catch (error) {
      this.logger.error(
        `Error updating notification ${notificationId} as read:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Mark all notifications to the patient as read*/
  async markAllAsRead(patientId: number) {
    try {
      return this.prisma.notificationLog.updateMany({
        where: {
          patient_id: patientId,
          is_read: false,
        },
        data: { is_read: true },
      });
    } catch (error) {
      this.logger.error(
        `Error updating all patient notifications ${patientId} as read:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get the number of unread notifications*/
  async getUnreadCount(patientId: number) {
    try {
      return this.prisma.notificationLog.count({
        where: {
          patient_id: patientId,
          is_read: false,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error calculating unread notifications for patient ${patientId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete old notification (optional)*/
  async deleteNotification(notificationId: number) {
    try {
      return this.prisma.notificationLog.delete({
        where: { notification_id: notificationId },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting notification ${notificationId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Deactivate all patient devices (when logged out)*/
  async deactivateAllDevices(patientId: number) {
    try {
      return this.prisma.patientDeviceToken.updateMany({
        where: { patient_id: patientId },
        data: { is_active: false },
      });
    } catch (error) {
      this.logger.error(
        `Error deactivating patient devices ${patientId}:`,
        error,
      );
      throw error;
    }
  }
}
