import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import {
  MailOptions,
  TemplateMailOptions,
  MailConfig,
} from './interfaces/mail-options.interface';
import {
  ResetPasswordTemplateData,
  AccountVerificationTemplateData,
  AdminVerificationTemplateData,
  WelcomeTemplateData,
  AppointmentConfirmationTemplateData,
  ChatTranscriptTemplateData,
} from './interfaces/template-data.interface';

// Import templates
import { resetPasswordTemplate } from './templates/reset-password.template';
import { accountVerificationTemplate } from './templates/account-verification.template';
import { adminVerificationTemplate } from './templates/admin-verification.template';
import { welcomeTemplate } from './templates/welcome.template';
import { appointmentConfirmationTemplate } from './templates/appointment-confirmation.template';
import { chatTranscriptTemplate } from './templates/chat-transcript.template';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;
  private mailConfig: MailConfig;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.mailConfig = this.configService.get<MailConfig>('mail')!;
    this.initializeTransporter();
    this.compileTemplates();
  }

  private initializeTransporter(): void {
    if (!this.mailConfig.enabled) {
      this.logger.warn('Mail service is disabled');
      return;
    }

    if (!this.mailConfig.auth.user || !this.mailConfig.auth.pass) {
      this.logger.warn(
        'Mail credentials not configured. Mail service will be disabled.',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.mailConfig.host,
        port: this.mailConfig.port,
        secure: this.mailConfig.secure,
        auth: {
          user: this.mailConfig.auth.user,
          pass: this.mailConfig.auth.pass,
        },
        tls: {
          rejectUnauthorized: false, // For development, set to true in production
        },
      });

      this.logger.log('Mail transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize mail transporter:', error);
    }
  }

  private compileTemplates(): void {
    try {
      // Register Handlebars helpers
      Handlebars.registerHelper('eq', function (a, b) {
        return a === b;
      });

      // Compile templates
      this.templates.set(
        'reset-password',
        Handlebars.compile(resetPasswordTemplate),
      );
      this.templates.set(
        'account-verification',
        Handlebars.compile(accountVerificationTemplate),
      );
      this.templates.set(
        'admin-verification',
        Handlebars.compile(adminVerificationTemplate),
      );
      this.templates.set('welcome', Handlebars.compile(welcomeTemplate));
      this.templates.set(
        'appointment-confirmation',
        Handlebars.compile(appointmentConfirmationTemplate),
      );
      this.templates.set(
        'chat-transcript',
        Handlebars.compile(chatTranscriptTemplate),
      );

      // Register Handlebars helpers
      Handlebars.registerHelper('eq', function (a, b) {
        return a === b;
      });

      this.logger.log('Email templates compiled successfully');
    } catch (error) {
      this.logger.error('Failed to compile email templates:', error);
    }
  }

  async sendMail(mailOptions: MailOptions): Promise<boolean> {
    if (!this.mailConfig.enabled || !this.transporter) {
      this.logger.warn('Mail service is disabled or not configured');
      return false;
    }

    try {
      const options = {
        ...mailOptions,
        from: mailOptions.from || this.mailConfig.from,
      };

      const result = await this.transporter.sendMail(options);
      this.logger.log(
        `Email sent successfully to ${mailOptions.to}. Message ID: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${mailOptions.to}:`, error);
      return false;
    }
  }

  async sendTemplateMail(
    templateMailOptions: TemplateMailOptions,
  ): Promise<boolean> {
    if (!this.mailConfig.enabled || !this.transporter) {
      this.logger.warn('Mail service is disabled or not configured');
      return false;
    }

    try {
      const template = this.templates.get(templateMailOptions.template);
      if (!template) {
        this.logger.error(
          `Template '${templateMailOptions.template}' not found`,
        );
        return false;
      }

      const html = template(templateMailOptions.context);

      const mailOptions: MailOptions = {
        to: templateMailOptions.to,
        subject: templateMailOptions.subject,
        html,
        from: templateMailOptions.from || this.mailConfig.from,
        cc: templateMailOptions.cc,
        bcc: templateMailOptions.bcc,
      };

      return await this.sendMail(mailOptions);
    } catch (error) {
      this.logger.error(
        `Failed to send template email '${templateMailOptions.template}' to ${templateMailOptions.to}:`,
        error,
      );
      return false;
    }
  }

  // Convenience methods for specific email types
  async sendResetPasswordEmail(
    to: string,
    data: ResetPasswordTemplateData,
  ): Promise<boolean> {
    return this.sendTemplateMail({
      to,
      subject: 'Reset Your Password',
      template: 'reset-password',
      context: data,
    });
  }

  async sendAccountVerificationEmail(
    to: string,
    data: AccountVerificationTemplateData,
  ): Promise<boolean> {
    return this.sendTemplateMail({
      to,
      subject: 'Verify Your Account',
      template: 'account-verification',
      context: data,
    });
  }

  async sendWelcomeEmail(
    to: string,
    data: WelcomeTemplateData,
  ): Promise<boolean> {
    return this.sendTemplateMail({
      to,
      subject: 'Welcome to Our Platform!',
      template: 'welcome',
      context: data,
    });
  }

  async sendAdminVerificationEmail(
    to: string,
    data: AdminVerificationTemplateData,
  ): Promise<boolean> {
    return this.sendTemplateMail({
      to,
      subject: 'Verify Your Admin Account - Live Chat System',
      template: 'admin-verification',
      context: data,
    });
  }

  async sendAppointmentConfirmationEmail(
    to: string,
    data: AppointmentConfirmationTemplateData,
  ): Promise<boolean> {
    return this.sendTemplateMail({
      to,
      subject: 'Appointment Confirmation',
      template: 'appointment-confirmation',
      context: data,
    });
  }

  async sendChatTranscriptEmail(
    to: string,
    data: ChatTranscriptTemplateData,
  ): Promise<boolean> {
    return this.sendTemplateMail({
      to,
      subject: `🚨 Agent Inactivity Alert - Chat Session ${data.sessionId} Ended`,
      template: 'chat-transcript',
      context: data,
    });
  }

  // Test email functionality
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Mail transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      this.logger.log('Mail server connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Mail server connection failed:', error);
      return false;
    }
  }

  // Send test email
  async sendTestEmail(to: string): Promise<boolean> {
    return this.sendMail({
      to,
      subject: 'Test Email from Live Chat App',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email to verify that the mail service is working correctly.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `,
    });
  }
}
