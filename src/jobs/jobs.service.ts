import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatSessionService } from '../chat/services/chat-session/chat-session.service';
import { ChatNotificationService } from '../chat/services/chat-notification/chat-notification.service';
import { ChatMessageService } from '../chat/services/chat-message/chat-message.service';
import { ChatTranscriptService } from '../chat/services/chat-transcript/chat-transcript.service';
import { AgentsService } from '../agents/agents.service';
import { ConfigService } from '@nestjs/config';
import {
  ChatMessageSenderType,
  ChatSessionStatus,
} from '../shared/constants/enums';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly agentInactivityThresholdMs: number;
  private readonly customerInactivityThresholdMs: number;
  private readonly firstAlertThresholdMs: number;
  private readonly subsequentAlertIntervalMs: number;
  private readonly maxPriorityAlerts: number;

  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly chatNotificationService: ChatNotificationService,
    private readonly chatMessageService: ChatMessageService,
    private readonly chatTranscriptService: ChatTranscriptService,
    private readonly agentsService: AgentsService,
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
    // Configuration for unattended chat notifications
    this.firstAlertThresholdMs =
      this.configService.get<number>('chatTimers.firstAlertThresholdMs') ||
      60000;
    this.subsequentAlertIntervalMs =
      this.configService.get<number>('chatTimers.subsequentAlertIntervalMs') ||
      60000;
    this.maxPriorityAlerts =
      this.configService.get<number>('chatTimers.maxPriorityAlerts') || 3;
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
        await this.chatTranscriptService.sendTranscriptEmailForInactivity(
          updatedSession,
          'agent',
          this.agentInactivityThresholdMs / 60000,
        );
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
        await this.chatTranscriptService.sendTranscriptEmailForInactivity(
          updatedSession,
          'customer',
          this.customerInactivityThresholdMs / 60000,
        );
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
   * Scheduled job that runs every 10 minutes to check if agents are within their shift hours
   * If an agent is online but outside their shift hours, they will be marked as offline
   */
  @Cron('0 */10 * * * *') // Every 10 minutes
  async checkAgentShiftStatus() {
    this.logger.debug('Running scheduled job: checkAgentShiftStatus');

    try {
      // Get all online agents
      const onlineAgents = await this.agentsService.getAllOnlineAgents();

      if (onlineAgents.length === 0) {
        this.logger.debug('No online agents found');
        return;
      }

      this.logger.debug(
        `Checking shift status for ${onlineAgents.length} online agents`,
      );

      let agentsSetOffline = 0;

      // Check each online agent's shift status
      for (const agent of onlineAgents) {
        try {
          const userId = agent.userId.toString();
          const availability =
            await this.agentsService.isAgentCurrentlyAvailable(userId);

          // If agent is online but not within shift, set them offline
          if (availability.isOnline && !availability.isWithinShift) {
            this.logger.log(
              `Agent ${userId} is online but outside shift hours. Setting offline.`,
            );

            await this.agentsService.setOnlineStatus(userId, false);
            agentsSetOffline++;

            this.logger.log(
              `Agent ${userId} has been set offline due to being outside shift hours`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error checking shift status for agent ${agent.userId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Shift status check completed. ${agentsSetOffline} agents were set offline due to being outside shift hours`,
      );
    } catch (error) {
      this.logger.error(
        `Error in checkAgentShiftStatus job: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Scheduled job that runs every 5 minutes to handle unattended chat notifications
   * Sends priority notifications to eligible agents for pending sessions
   * and marks expired sessions as EXPIRED_PENDING_ASSIGNMENT
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleUnattendedChatNotifications() {
    this.logger.debug('Running unattended chat notification job...');

    try {
      const pendingSessions =
        await this.chatSessionService.getPendingAssignmentSessions(
          this.firstAlertThresholdMs,
          this.subsequentAlertIntervalMs,
          this.maxPriorityAlerts,
        );

      for (const session of pendingSessions) {
        this.logger.debug(
          `Processing pending session: ${session._id}, count: ${session.priorityNotificationSentCount}`,
        );
        // Use the widget ID from the session for finding eligible agents
        const eligibleAgents = await this.agentsService.getEligibleOnlineAgents(
          session.widgetId, // Use the widget ID which contains departmentIds
          session.domain,
        );

        if (eligibleAgents.length > 0) {
          this.logger.log(
            `Found ${eligibleAgents.length} eligible agents for session ${session._id}. Sending priority notification.`,
          );

          await this.chatSessionService.incrementPriorityNotificationCount(
            session._id,
          );

          // Delegate socket notifications to ChatNotificationService
          await this.chatNotificationService.sendPriorityNotificationToAgents(
            eligibleAgents,
            session,
          );
        } else {
          this.logger.warn(
            `No eligible agents found for priority notification for session ${session._id}.`,
          );
        }
      }

      // Handle expired pending sessions
      const expiredSessions =
        await this.chatSessionService.getExpiredPendingSessions(
          this.subsequentAlertIntervalMs,
          this.maxPriorityAlerts,
        );
      for (const session of expiredSessions) {
        this.logger.log(
          `Session ${session._id} has expired pending assignment. Updating status.`,
        );
        const updated = await this.chatSessionService.updateSessionStatus(
          session._id,
          ChatSessionStatus.EXPIRED_PENDING_ASSIGNMENT,
        );

        // Delegate socket notification to ChatNotificationService
        if (updated) {
          await this.chatNotificationService.notifyCustomerAboutExpiredSession(
            updated,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in handleUnattendedChatNotifications job: ${error.message}`,
        error.stack,
      );
    }
  }
}
