import { Injectable, Logger } from '@nestjs/common';
import { ChatSessionService } from '../chat-session/chat-session.service';
import { ChatMessageService } from '../chat-message/chat-message.service';
import { MailerService } from '../../../shared/mailer/mailer.service';
import { AgentsService } from '../../../agents/agents.service';
import { UsersService } from '../../../users/users.service';
import { CustomersService } from '../../../customers/customers.service';
import { DepartmentsService } from '../../../departments/departments.service';
import { WidgetsService } from '../../../widgets/widgets.service';
import { ChatTranscriptTemplateData } from '../../../shared/mailer/interfaces/template-data.interface';
import { ChatMessageSenderType } from '../../../shared/constants/enums';

export interface ChatEndingContext {
  endType:
    | 'inactivity'
    | 'manual_end'
    | 'system_timeout'
    | 'technical_issue'
    | 'other';
  endedBy: 'agent' | 'customer' | 'system';
  endReason: string;
}

@Injectable()
export class ChatTranscriptService {
  private readonly logger = new Logger(ChatTranscriptService.name);

  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly chatMessageService: ChatMessageService,
    private readonly mailerService: MailerService,
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
    private readonly departmentsService: DepartmentsService,
    private readonly widgetsService: WidgetsService,
  ) {}

  /**
   * Send transcript email for any chat ending scenario
   * @param sessionId - The ID of the chat session that ended
   * @param context - The context of how the chat ended
   */
  async sendTranscriptEmail(
    sessionId: string,
    context: ChatEndingContext,
  ): Promise<void> {
    try {
      const session = await this.chatSessionService.findById(sessionId);
      if (!session) {
        this.logger.warn(`Session ${sessionId} not found for transcript email`);
        return;
      }

      await this.processTranscriptEmail(session, context);
    } catch (error) {
      this.logger.error(
        `Error sending transcript email for session ${sessionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Send transcript email for manual chat ending
   * @param sessionId - The ID of the chat session that ended
   * @param endedBy - Who ended the chat ('agent' or 'customer')
   * @param reason - Optional reason for ending the chat
   */
  async sendTranscriptEmailForManualEnd(
    sessionId: string,
    endedBy: 'agent' | 'customer',
    reason?: string,
  ): Promise<void> {
    const endReason = reason || `Chat manually ended by ${endedBy}`;
    const context: ChatEndingContext = {
      endType: 'manual_end',
      endedBy,
      endReason,
    };

    await this.sendTranscriptEmail(sessionId, context);
  }

  /**
   * Send transcript email for inactivity (used by JobsService)
   * @param session - The chat session that ended due to inactivity
   * @param inactivityType - The type of inactivity ('agent' or 'customer')
   * @param inactivityThresholdMinutes - The inactivity threshold in minutes
   */
  async sendTranscriptEmailForInactivity(
    session: any,
    inactivityType: 'agent' | 'customer',
    inactivityThresholdMinutes: number,
  ): Promise<void> {
    const endReason = `${inactivityType === 'agent' ? 'Agent' : 'Customer'} was inactive for more than ${inactivityThresholdMinutes} minutes`;
    const context: ChatEndingContext = {
      endType: 'inactivity',
      endedBy: inactivityType,
      endReason,
    };

    await this.processTranscriptEmail(session, context);
  }

  /**
   * Process and send transcript email
   * @param session - The chat session
   * @param context - The ending context
   */
  private async processTranscriptEmail(
    session: any,
    context: ChatEndingContext,
  ): Promise<void> {
    try {
      // Get customer details with populated data
      const sessionWithCustomer = await this.chatSessionService.findById(
        session._id,
        {
          populateCustomer: true,
          populateWidget: false,
          populateDepartment: false,
        },
      );

      if (!sessionWithCustomer) {
        this.logger.warn(
          `Session ${session._id} not found for transcript email`,
        );
        return;
      }

      const customer = sessionWithCustomer.customerId as any;

      // Get widget details to find notification emails
      const widget = await this.widgetsService.findById(
        sessionWithCustomer.widgetId,
      );

      if (!widget) {
        this.logger.warn(`Widget not found for session ${session._id}`);
        return;
      }

      // Check if widget has notification emails configured
      if (
        !widget.notification_emails ||
        widget.notification_emails.length === 0
      ) {
        this.logger.debug(
          `Widget ${widget._id} has no notification emails configured for session ${session._id}`,
        );
        return;
      }

      // Get all messages for the session
      const messages = await this.chatMessageService.getAllMessagesForSession(
        session._id.toString(),
      );

      // Get department details
      const department = await this.departmentsService.findById(
        sessionWithCustomer.departmentId.toString(),
      );

      // Process agent history to get agent names and calculate durations
      const agentHistoryWithDetails = await Promise.all(
        sessionWithCustomer.agentHistory.map(async (agentHist) => {
          try {
            const user = await this.usersService.findById(
              agentHist.agentId.toString(),
            );

            const joinedAt = new Date(agentHist.joinedAt);
            const leftAt = agentHist.leftAt
              ? new Date(agentHist.leftAt)
              : new Date();
            const durationMs = leftAt.getTime() - joinedAt.getTime();
            const durationMinutes = Math.floor(durationMs / 60000);
            const durationSeconds = Math.floor((durationMs % 60000) / 1000);

            let agentName = 'Unknown Agent';
            if (user?.firstName && user?.lastName) {
              agentName = `${user.firstName} ${user.lastName}`;
            } else if (user?.email) {
              agentName = user.email;
            }

            return {
              agentName,
              joinedAt: joinedAt.toLocaleString(),
              leftAt: agentHist.leftAt ? leftAt.toLocaleString() : undefined,
              duration: `${durationMinutes}m ${durationSeconds}s`,
            };
          } catch (error) {
            this.logger.error(
              `Error getting agent details for ${agentHist.agentId}: ${error.message}`,
            );
            return {
              agentName: 'Unknown Agent',
              joinedAt: new Date(agentHist.joinedAt).toLocaleString(),
              leftAt: agentHist.leftAt
                ? new Date(agentHist.leftAt).toLocaleString()
                : undefined,
              duration: 'Unknown',
            };
          }
        }),
      );

      // Process messages for transcript
      const transcript = await Promise.all(
        messages.map(async (message) => {
          let senderName = 'Unknown';

          if (message.senderType === ChatMessageSenderType.CUSTOMER) {
            senderName = customer.name || customer.email || 'Customer';
          } else if (message.senderType === ChatMessageSenderType.AGENT) {
            try {
              const user = await this.usersService.findById(
                message.senderId.toString(),
              );

              if (user?.firstName && user?.lastName) {
                senderName = `${user.firstName} ${user.lastName}`;
              } else if (user?.email) {
                senderName = user.email;
              } else {
                senderName = 'Agent';
              }
            } catch (error) {
              senderName = 'Agent';
            }
          }

          return {
            timestamp: new Date(message.timestamp).toLocaleString(),
            senderName,
            senderType:
              message.senderType === ChatMessageSenderType.CUSTOMER
                ? ('customer' as const)
                : ('agent' as const),
            message:
              typeof message.content === 'object'
                ? message.content.text || JSON.stringify(message.content)
                : String(message.content),
          };
        }),
      );

      // Prepare email data with enhanced subject generation
      const emailData: ChatTranscriptTemplateData = {
        customerName: customer.name || customer.email || 'Anonymous Customer',
        customerEmail: customer.email,
        sessionId: session._id.toString(),
        chatStartTime: new Date(
          sessionWithCustomer.initiatedAt,
        ).toLocaleString(),
        chatEndTime: new Date(
          sessionWithCustomer.endedAt || new Date(),
        ).toLocaleString(),
        // Legacy fields for backward compatibility
        inactivityReason: context.endReason,
        inactivityType:
          context.endedBy === 'system' ? 'agent' : context.endedBy, // Fallback for system
        // New generic fields for all ending types
        endReason: context.endReason,
        endType: context.endType,
        endedBy: context.endedBy,
        agentHistory: agentHistoryWithDetails,
        transcript,
        domain: sessionWithCustomer.domain,
        department: department?.name || 'Unknown Department',
      };

      // Generate appropriate subject based on context
      const subject = this.generateEmailSubject(
        context,
        session._id.toString(),
      );

      // Send emails to all notification emails configured in the widget
      const notificationEmails = widget.notification_emails;
      let successCount = 0;
      let failureCount = 0;

      for (const email of notificationEmails) {
        try {
          let emailSent: boolean;

          // Use different email methods based on context
          if (context.endType === 'manual_end') {
            emailSent = await this.mailerService.sendChatManualEndEmail(
              email.trim(),
              subject,
              emailData,
            );
          } else {
            // Use the original template for inactivity and other types
            emailSent = await this.mailerService.sendChatTranscriptEmail(
              email.trim(),
              subject,
              emailData,
            );
          }

          if (emailSent) {
            successCount++;
            this.logger.log(
              `Transcript email sent successfully to ${email} for session ${session._id} (${context.endType} by ${context.endedBy})`,
            );
          } else {
            failureCount++;
            this.logger.warn(
              `Failed to send transcript email to ${email} for session ${session._id}`,
            );
          }
        } catch (emailError) {
          failureCount++;
          this.logger.error(
            `Error sending transcript email to ${email} for session ${session._id}: ${emailError.message}`,
          );
        }
      }

      this.logger.log(
        `Transcript email summary for session ${session._id} (${context.endType} by ${context.endedBy}): ${successCount} sent successfully, ${failureCount} failed out of ${notificationEmails.length} total emails`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing transcript email for session ${session._id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate appropriate email subject based on chat ending context
   */
  private generateEmailSubject(
    context: ChatEndingContext,
    sessionId: string,
  ): string {
    switch (context.endType) {
      case 'inactivity':
        const inactiveParty =
          context.endedBy === 'agent' ? 'Agent' : 'Customer';
        return `🚨 ${inactiveParty} Inactivity Alert - Chat Session Ended`;

      case 'manual_end':
        const endingParty = context.endedBy === 'agent' ? 'Agent' : 'Customer';
        return `💬 Chat Session Ended by ${endingParty}`;

      case 'system_timeout':
        return `⏰ Chat Session Ended - System Timeout`;

      case 'technical_issue':
        return `⚠️ Chat Session Ended - Technical Issue`;

      case 'other':
      default:
        return `📋 Chat Session Transcript`;
    }
  }
}
