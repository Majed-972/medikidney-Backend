import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

type EmailProviderMode = 'resend' | 'smtp' | 'dev-log';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: nodemailer.Transporter;
  private readonly providerMode: EmailProviderMode;
  private readonly fromEmail: string | undefined;
  private readonly fromName: string;
  private readonly resendApiKey: string | undefined;
  private readonly resendApiBaseUrl: string;

  constructor() {
    this.resendApiKey = process.env.RESEND_API_KEY?.trim();
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = this.parseNumber(process.env.SMTP_PORT, 587);
    const secure = this.parseBoolean(process.env.SMTP_SECURE, port === 465);
    const connectionTimeout = this.parseNumber(
      process.env.MAIL_CONNECTION_TIMEOUT_MS,
      10000,
    );
    const greetingTimeout = this.parseNumber(
      process.env.MAIL_GREETING_TIMEOUT_MS,
      10000,
    );
    const socketTimeout = this.parseNumber(
      process.env.MAIL_SOCKET_TIMEOUT_MS,
      20000,
    );

    this.fromEmail = process.env.MAIL_FROM_EMAIL?.trim() || user;
    this.fromName = process.env.MAIL_FROM_NAME || 'MediKidney System';
    this.resendApiBaseUrl =
      process.env.RESEND_API_BASE_URL?.trim() || 'https://api.resend.com';

    if (this.resendApiKey) {
      this.providerMode = 'resend';
      this.logger.log(
        `Email provider configured: Resend API (${this.resendApiBaseUrl})`,
      );
      return;
    }

    if (user && pass) {
      const transportOptions: SMTPTransport.Options = {
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout,
        greetingTimeout,
        socketTimeout,
        logger: process.env.NODE_ENV !== 'production',
        debug: process.env.NODE_ENV !== 'production',
      };

      this.transporter = nodemailer.createTransport(transportOptions);
      this.providerMode = 'smtp';
      this.logger.log(
        `SMTP transporter initialized for ${host}:${port} with a ${connectionTimeout}ms connection timeout`,
      );
      return;
    }

    this.providerMode = 'dev-log';
    this.logger.warn(
      'No email provider credentials found. Emails will not be sent and OTPs will be logged only.',
    );
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (!value) {
      return fallback;
    }

    return value.toLowerCase() === 'true';
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Unknown error';
  }

  private extractErrorDetails(error: unknown): string {
    if (error && typeof error === 'object') {
      const details = error as {
        code?: string;
        command?: string;
        responseCode?: number;
        response?: string;
        errno?: string | number;
      };

      const parts = [
        details.code ? `code=${details.code}` : null,
        details.command ? `command=${details.command}` : null,
        typeof details.responseCode === 'number'
          ? `responseCode=${details.responseCode}`
          : null,
        details.errno ? `errno=${details.errno}` : null,
        details.response ? `response=${details.response}` : null,
      ].filter(Boolean);

      if (parts.length > 0) {
        return parts.join(', ');
      }
    }

    return 'no structured details';
  }

  private getFromAddress(): string {
    return `"${this.fromName}" <${this.fromEmail}>`;
  }

  private ensureFromEmail() {
    if (!this.fromEmail) {
      this.logger.error(
        'Email provider is configured, but MAIL_FROM_EMAIL/SMTP_USER is missing.',
      );
      throw new ServiceUnavailableException(
        'The email service is not configured correctly at this time.',
      );
    }
  }

  private async sendViaResend(payload: EmailPayload) {
    this.ensureFromEmail();

    const response = await fetch(`${this.resendApiBaseUrl}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.getFromAddress(),
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const rawBody = await response.text();
      this.logger.error(
        `Resend API rejected email with status ${response.status}: ${rawBody}`,
      );
      throw new Error(
        `Resend API request failed with status ${response.status}`,
      );
    }
  }

  private async sendViaSmtp(payload: EmailPayload) {
    if (!this.transporter) {
      throw new Error('SMTP transporter is not initialized');
    }

    this.ensureFromEmail();

    await this.transporter.sendMail({
      from: this.getFromAddress(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  }

  private async sendEmail(payload: EmailPayload): Promise<void> {
    if (this.providerMode === 'dev-log') {
      this.logger.debug(
        `[DEV MODE] Email to ${payload.to} with subject "${payload.subject}" was not sent because no email provider is configured.`,
      );
      return;
    }

    try {
      if (this.providerMode === 'resend') {
        await this.sendViaResend(payload);
        this.logger.log(`Email sent to ${payload.to} via Resend`);
        return;
      }

      await this.sendViaSmtp(payload);
      this.logger.log(`Email sent to ${payload.to} via SMTP`);
    } catch (error: unknown) {
      const message = this.extractErrorMessage(error);
      const details = this.extractErrorDetails(error);

      this.logger.error(
        `Failed to send email via ${this.providerMode} to ${payload.to}: ${message} (${details})`,
      );

      if (
        this.providerMode === 'smtp' &&
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNREFUSED'].includes(
          String((error as { code?: unknown }).code),
        )
      ) {
        this.logger.error(
          'SMTP connection failed at the network layer. On platforms like Render free web services and Railway non-Pro plans, outbound SMTP is commonly blocked.',
        );
      }

      if (
        this.providerMode === 'smtp' &&
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        String((error as { code?: unknown }).code) === 'EAUTH'
      ) {
        this.logger.error(
          'SMTP authentication failed. Check the Gmail app password or SMTP credentials configured on the server.',
        );
      }

      throw new ServiceUnavailableException(
        'Unable to connect to the email service at this time. Please try again later.',
      );
    }
  }

  async sendOtpEmail(email: string, otp: string): Promise<void> {
    if (this.providerMode === 'dev-log') {
      this.logger.debug(`[DEV MODE] OTP for ${email}: ${otp}`);
      return;
    }

    await this.sendEmail({
      to: email,
      subject: 'Password reset code - MediKidney',
      html: this.getEmailTemplate(otp),
      text: `Your verification code is: ${otp}. Valid for 10 minutes.`,
    });
  }

  async sendTemporaryPasswordEmail(
    email: string,
    fullName: string,
    username: string,
    temporaryPassword: string,
    role: string,
  ): Promise<void> {
    if (this.providerMode === 'dev-log') {
      this.logger.debug(
        `[DEV MODE] Temp password for ${email}: ${temporaryPassword}`,
      );
      return;
    }

    await this.sendEmail({
      to: email,
      subject: 'Your account data in the MediKidney system',
      html: this.getTempPasswordTemplate(
        fullName,
        username,
        temporaryPassword,
        role,
      ),
      text:
        `Hello ${fullName},\n\n` +
        'Your account has been created in the MediKidney system.\n\n' +
        `Username: ${username}\n` +
        `Temporary password: ${temporaryPassword}\n\n` +
        'Please change your password immediately after logging in.',
    });
  }

  private getEmailTemplate(otp: string): string {
    return `<!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
            .card { max-width: 500px; margin:auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #eee; text-align: center; }
            .otp { font-size: 32px; font-weight: bold; color: #4A90E2; letter-spacing: 4px; margin: 20px 0; }
            .footer { font-size: 12px; color: #888; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Reset Password</h2>
            <p>Use the following code to complete the operation:</p>
            <div class="otp">${otp}</div>
            <p>This code is valid for <b>10 minutes</b> only.</p>
            <div class="footer">If you did not request this code, please ignore the message.</div>
          </div>
        </body>
      </html>`;
  }

  private getTempPasswordTemplate(
    fullName: string,
    username: string,
    temporaryPassword: string,
    role: string,
  ): string {
    const roleNames: Record<string, string> = {
      DOCTOR: 'doctor',
      NURSE: 'nurse',
      PHARMACIST: 'pharmaceutical',
      LAB_TECH: 'Laboratory technician',
      RADIOLOGIST: 'Radiologist',
      NUTRITIONIST: 'Nutritionist',
      PATIENT: 'sick',
    };

    return `<!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .container { max-width: 600px; margin:auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4A90E2, #357ABD); padding: 30px; text-align: center; colour: white; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 40px 30px; }
            .welcome { font-size: 18px; color: #333; margin-bottom: 20px; }
            .role-badge { display: inline-block; background: #e3f2fd; color: #1976d2; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin-bottom: 20px; }
            .credentials { background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 12px; padding: 25px; margin: 20px 0; }
            .credential-row { margin: 15px 0; }
            .credential-label { color: #666; font-size: 14px; margin-bottom: 5px; }
            .credential-value { font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #2c3e50; background: white; padding: 10px; border-radius: 6px; border: 1px solid #e0e0e0; }
            .password { color: #e74c3c; font-size: 20px; }
            .alert { background: #fff3e0; border-right: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .alert-title { color: #e65100; font-weight: bold; margin-bottom: 5px; }
            .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>MediKidney</h1>
              <p>Dialysis department management system</p>
            </div>
            <div class="content">
              <div class="welcome">Welcome <strong>${fullName}</strong>,</div>
              <div class="role-badge">${roleNames[role] || role}</div>
              <p>Your account has been successfully created in the MediKidney system. Here is your login information:</p>

              <div class="credentials">
                <div class="credential-row">
                  <div class="credential-label">Username:</div>
                  <div class="credential-value">${username}</div>
                </div>
                <div class="credential-row">
                  <div class="credential-label">Temporary password:</div>
                  <div class="credential-value password">${temporaryPassword}</div>
                </div>
              </div>

              <div class="alert">
                <div class="alert-title">Important security alert</div>
                <div>Please change your password immediately after your first login. The system will ask you to set a new password.</div>
              </div>

              <p style="color: #666; font-size: 14px;">
                To access the system, visit:
                <a href="https://medikidney.com/login">medikidney.com/login</a>
              </p>
            </div>
            <div class="footer">
              <p>This message is sent automatically from the MediKidney system.</p>
              <p>If you are not the one who requested this account, please ignore this message.</p>
            </div>
          </div>
        </body>
      </html>`;
  }
}
