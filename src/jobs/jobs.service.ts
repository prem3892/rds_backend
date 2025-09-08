import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ChatSessionService } from '../chat/services/chat-session/chat-session.service';
import { ChatNotificationService } from '../chat/services/chat-notification/chat-notification.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly agentInactivityThresholdMs: number;

  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly chatNotificationService: ChatNotificationService,
    private readonly configService: ConfigService,
  ) {
    // Default to 3 minutes (180000ms) if not configured
    this.agentInactivityThresholdMs =
      this.configService.get<number>('chatTimers.agentInactivityThresholdMs') ||
      180000;
  }

  /**
   * Scheduled job that runs every minute to check for inactive agents in chat sessions
   * If an agent has been inactive for more than the configured threshold (default 3 minutes),
   * the chat session is updated to PENDING_ASSIGNMENT and the agent is marked as inactive
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkForInactiveAgents() {
    this.logger.debug('Running scheduled job: checkForInactiveAgents');

    try {
      // Find sessions with inactive agents
      const inactiveSessions =
        await this.chatSessionService.findSessionsWithInactiveAgents(
          this.agentInactivityThresholdMs,
        );

      if (inactiveSessions.length === 0) {
        this.logger.debug('No inactive agents found in chat sessions');
        return;
      }

      this.logger.log(
        `Found ${inactiveSessions.length} chat sessions with inactive agents`,
      );

      // Process each session with an inactive agent
      for (const session of inactiveSessions) {
        try {
          const agentId = session.agentId?.toString();
          const sessionId = session._id.toString();

          if (!agentId || !sessionId) continue;

          this.logger.log(
            `Agent ${agentId} has been inactive for more than ${this.agentInactivityThresholdMs / 60000} minutes in session ${sessionId}`,
          );

          // Mark the agent as inactive and update the session status
          const updatedSession =
            await this.chatSessionService.markAgentInactive(sessionId, agentId);

          // Notify the customer that the agent is no longer available
          await this.chatNotificationService.notifyCustomerAboutAgentInactivity(
            updatedSession,
          );

          // Notify available agents about the pending chat
          await this.chatNotificationService.notifyAgentsAboutPendingChat(
            updatedSession,
          );
        } catch (error) {
          this.logger.error(
            `Error processing inactive agent for session ${session._id}: ${error.message}`,
            error.stack,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in checkForInactiveAgents job: ${error.message}`,
        error.stack,
      );
    }
  }
}
