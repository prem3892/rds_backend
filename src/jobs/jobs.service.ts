import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatSessionService } from '../chat/services/chat-session/chat-session.service';
import { ChatNotificationService } from '../chat/services/chat-notification/chat-notification.service';
import { ChatMessageService } from '../chat/services/chat-message/chat-message.service';
import { MailerService } from '../shared/mailer/mailer.service';
import { AgentsService } from '../agents/agents.service';
import { UsersService } from '../users/users.service';
import { CustomersService } from '../customers/customers.service';
import { DepartmentsService } from '../departments/departments.service';
import { WidgetsService } from '../widgets/widgets.service';
import { ConfigService } from '@nestjs/config';
import { ChatTranscriptTemplateData } from '../shared/mailer/interfaces/template-data.interface';
import { ChatMessageSenderType } from '../shared/constants/enums';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly agentInactivityThresholdMs: number;
  private readonly customerInactivityThresholdMs: number;

  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly chatNotificationService: ChatNotificationService,
    private readonly chatMessageService: ChatMessageService,
    private readonly mailerService: MailerService,
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
    private readonly departmentsService: DepartmentsService,
    private readonly widgetsService: WidgetsService,
    private readonly configService: ConfigService,
  ) {
    // Default to 3 minutes (180000ms) if not configured
    this.agentInactivityThresholdMs =
      this.configService.get<number>('chatTimers.agentInactivityThresholdMs') ||
      180000;
    // Default to 10 minutes (600000ms) if not configured
    this.customerInactivityThresholdMs =
      this.configService.get<number>(
        'chatTimers.customerInactivityThresholdMs',
      ) || 600000;
  }

  /**
   * Scheduled job that runs every minute to check for inactive participants (agents and customers) in chat sessions
   * If an agent has been inactive for more than the configured threshold (default 3 minutes),
   * the chat session is updated to PENDING_ASSIGNMENT and the agent is marked as inactive
   * If a customer has been inactive for more than the configured threshold (default 10 minutes),
   * the chat session is updated to ABANDONED_BY_CUSTOMER
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkForInactiveParticipants() {
    this.logger.debug('Running scheduled job: checkForInactiveParticipants');

    try {
      // Get all active sessions
      const activeSessions =
        await this.chatSessionService.findAllActiveSessions();

      if (activeSessions.length === 0) {
        this.logger.debug('No active chat sessions found');
        return;
      }

      this.logger.debug(
        `Checking ${activeSessions.length} active sessions for inactivity`,
      );

      // Process each active session to determine inactivity type
      for (const session of activeSessions) {
        try {
          const sessionId = session._id.toString();

          // Get the last non-system message to determine who should be checked for inactivity
          // We exclude system messages because they don't represent user activity
          const lastMessage =
            await this.chatMessageService.getLastNonSystemMessageForSession(
              sessionId,
            );

          if (!lastMessage) {
            this.logger.debug(
              `No non-system messages found for session ${sessionId}, skipping`,
            );
            continue;
          }

          // Determine inactivity type based on last non-system message sender
          if (lastMessage.senderType === ChatMessageSenderType.AGENT) {
            // Last message was from agent, check if customer is inactive
            await this.checkCustomerInactivity(session);
          } else if (
            lastMessage.senderType === ChatMessageSenderType.CUSTOMER
          ) {
            // Last message was from customer, check if agent is inactive
            await this.checkAgentInactivity(session);
          } else {
            this.logger.warn(
              `Unexpected sender type for last non-system message in session ${sessionId}: ${lastMessage.senderType}`,
            );
            continue;
          }
        } catch (error) {
          this.logger.error(
            `Error processing session ${session._id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in checkForInactiveParticipants job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Check if agent is inactive in the given session
   * @param session - The chat session to check
   */
  private async checkAgentInactivity(session: any): Promise<void> {
    const agentId = session.agentId?.toString();
    const sessionId = session._id.toString();

    if (!agentId || !session.agentLastSeen) {
      return;
    }

    const inactivityThreshold = new Date(
      Date.now() - this.agentInactivityThresholdMs,
    );

    if (session.agentLastSeen < inactivityThreshold) {
      this.logger.log(
        `Agent ${agentId} has been inactive for more than ${this.agentInactivityThresholdMs / 60000} minutes in session ${sessionId}`,
      );

      // Mark the agent as inactive and update the session status
      const updatedSession = await this.chatSessionService.markAgentInactive(
        sessionId,
        agentId,
      );

      // Notify the customer that the agent is no longer available
      await this.chatNotificationService.notifyCustomerAboutAgentInactivity(
        updatedSession,
      );

      // Notify available agents about the pending chat
      await this.chatNotificationService.notifyAgentsAboutPendingChat(
        updatedSession,
      );

      // Send transcript email
      try {
        await this.sendTranscriptEmailForInactivity(updatedSession, 'agent');
      } catch (emailError) {
        this.logger.error(
          `Error sending transcript email for session ${sessionId}: ${emailError.message}`,
          emailError.stack,
        );
      }
    }
  }

  /**
   * Check if customer is inactive in the given session
   * @param session - The chat session to check
   */
  private async checkCustomerInactivity(session: any): Promise<void> {
    const sessionId = session._id.toString();

    if (!session.customerLastSeen) {
      return;
    }

    const inactivityThreshold = new Date(
      Date.now() - this.customerInactivityThresholdMs,
    );

    if (session.customerLastSeen < inactivityThreshold) {
      this.logger.log(
        `Customer has been inactive for more than ${this.customerInactivityThresholdMs / 60000} minutes in session ${sessionId}`,
      );

      // Mark the customer as inactive and update the session status
      const updatedSession =
        await this.chatSessionService.markCustomerInactive(sessionId);

      // Notify the agent about customer inactivity
      await this.chatNotificationService.notifyAgentAboutCustomerInactivity(
        updatedSession,
      );

      // Send transcript email
      try {
        await this.sendTranscriptEmailForInactivity(updatedSession, 'customer');
      } catch (emailError) {
        this.logger.error(
          `Error sending transcript email for session ${sessionId}: ${emailError.message}`,
          emailError.stack,
        );
      }
    } else {
      this.logger.debug(`Customer is still active in session ${sessionId}`);
    }
  }

  /**
   * Send transcript email when chat session ends due to inactivity
   * @param session - The chat session that ended due to inactivity
   * @param inactivityType - The type of inactivity ('agent' or 'customer')
   */
  private async sendTranscriptEmailForInactivity(
    session: any,
    inactivityType: 'agent' | 'customer',
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
            const agentProfile =
              await this.agentsService.findAgentProfileByUserId(
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
              const agentProfile =
                await this.agentsService.findAgentProfileByUserId(
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

      // Prepare email data
      const inactivityReason =
        inactivityType === 'agent'
          ? `Agent was inactive for more than ${this.agentInactivityThresholdMs / 60000} minutes`
          : `Customer was inactive for more than ${this.customerInactivityThresholdMs / 60000} minutes`;

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
        inactivityReason,
        inactivityType,
        agentHistory: agentHistoryWithDetails,
        transcript,
        domain: sessionWithCustomer.domain,
        department: department?.name || 'Unknown Department',
      };

      // Send emails to all notification emails configured in the widget
      const notificationEmails = widget.notification_emails;
      let successCount = 0;
      let failureCount = 0;

      for (const email of notificationEmails) {
        try {
          const emailSent = await this.mailerService.sendChatTranscriptEmail(
            email.trim(),
            emailData,
          );

          if (emailSent) {
            successCount++;
            this.logger.log(
              `Transcript email sent successfully to ${email} for session ${session._id}`,
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
        `Transcript email summary for session ${session._id}: ${successCount} sent successfully, ${failureCount} failed out of ${notificationEmails.length} total emails`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending transcript email for session ${session._id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
