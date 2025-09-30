import { Controller, Post, Body, Get, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MailerService } from './mailer.service';
import { SendMailDto, SendTemplateMailDto } from './dto/send-mail.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../constants/enums';

@ApiTags('Mailer (Testing)')
@Controller('mailer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@ApiBearerAuth('JWT-auth')
export class MailerController {
  constructor(private readonly mailerService: MailerService) {}

  @Get('test-connection')
  @ApiOperation({
    summary: 'Test mail server connection',
    description: 'Test if the mail server connection is working properly',
  })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async testConnection() {
    const success = await this.mailerService.testConnection();
    return {
      success,
      message: success
        ? 'Mail server connection successful'
        : 'Mail server connection failed',
    };
  }

  @Post('send-test-email')
  @ApiOperation({
    summary: 'Send test email',
    description: 'Send a test email to verify mail functionality',
  })
  @ApiResponse({
    status: 200,
    description: 'Test email sent',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async sendTestEmail(@Query('to') to: string) {
    if (!to) {
      return {
        success: false,
        message: 'Email address is required in query parameter "to"',
      };
    }

    const success = await this.mailerService.sendTestEmail(to);
    return {
      success,
      message: success
        ? 'Test email sent successfully'
        : 'Failed to send test email',
    };
  }

  @Post('send-mail')
  @ApiOperation({
    summary: 'Send custom email',
    description: 'Send a custom email with HTML content',
  })
  @ApiResponse({
    status: 200,
    description: 'Email sent',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async sendMail(@Body() sendMailDto: SendMailDto) {
    const success = await this.mailerService.sendMail(sendMailDto);
    return {
      success,
      message: success ? 'Email sent successfully' : 'Failed to send email',
    };
  }

  @Post('send-template-mail')
  @ApiOperation({
    summary: 'Send template email',
    description: 'Send an email using a predefined template',
  })
  @ApiResponse({
    status: 200,
    description: 'Template email sent',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async sendTemplateMail(@Body() sendTemplateMailDto: SendTemplateMailDto) {
    const success =
      await this.mailerService.sendTemplateMail(sendTemplateMailDto);
    return {
      success,
      message: success
        ? 'Template email sent successfully'
        : 'Failed to send template email',
    };
  }

  @Post('send-welcome-email')
  @ApiOperation({
    summary: 'Send welcome email',
    description: 'Send a welcome email using the welcome template',
  })
  @ApiResponse({
    status: 200,
    description: 'Welcome email sent',
  })
  async sendWelcomeEmail(
    @Body()
    data: {
      to: string;
      firstName: string;
      lastName: string;
      role: string;
      loginUrl?: string;
      supportEmail?: string;
    },
  ) {
    const success = await this.mailerService.sendWelcomeEmail(data.to, {
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      loginUrl: data.loginUrl || 'http://localhost:3000/login',
      supportEmail: data.supportEmail || 'support@yourapp.com',
    });

    return {
      success,
      message: success
        ? 'Welcome email sent successfully'
        : 'Failed to send welcome email',
    };
  }
}
