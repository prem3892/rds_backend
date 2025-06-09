import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

import { ChatGateway } from 'src/chat/chat.gateway'; // To emit events
import { ChatSessionStatus } from 'src/shared/constants/enums';
import { ChatSessionService } from '../chat-session/chat-session.service';
import { AgentsService } from 'src/agents/agents.service';
import { WidgetsService } from 'src/widgets/widgets.service';

@Injectable()
export class ChatNotificationService {
  private readonly logger = new Logger(ChatNotificationService.name);
  private readonly firstAlertThresholdMs: number;
  private readonly subsequentAlertIntervalMs: number;
  private readonly maxPriorityAlerts: number;

  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly agentsService: AgentsService,
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService,
  ) {
    this.firstAlertThresholdMs =
      this.configService.get<number>('chatTimers.firstAlertThresholdMs') ||
      60000;
    this.subsequentAlertIntervalMs =
      this.configService.get<number>('chatTimers.subsequentAlertIntervalMs') ||
      60000;
    this.maxPriorityAlerts =
      this.configService.get<number>('chatTimers.maxPriorityAlerts') || 3;
  }

  @Cron(CronExpression.EVERY_30_SECONDS) // Configurable
  async handleUnattendedChatNotifications() {
    this.logger.debug('Running unattended chat notification job...');
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
        for (const agent of eligibleAgents) {
          // server:priority_chat_notification (payload: ChatSession object)
          this.chatGateway.sendPriorityChatNotification(
            agent.userId.toString(),
            session,
          );
        }
        await this.chatSessionService.incrementPriorityNotificationCount(
          session._id,
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
      // Notify customer if still connected
      if (updated) {
        this.chatGateway.notifyCustomerSessionExpired(
          updated.customerId.toString(),
          updated,
        );
      }
    }
  }
}
