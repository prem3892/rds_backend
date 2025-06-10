import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';

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

  private server: Server | null = null;

  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly agentsService: AgentsService,
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

  /**
   * Set the Socket.IO server instance (called from ChatGateway)
   */
  setServer(server: Server) {
    this.server = server;
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
          if (this.server) {
            this.server
              .to(`agent:${agent.userId.toString()}`)
              .emit('server:priority_chat_notification', session);
          }
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
      if (updated && this.server) {
        this.server
          .to(`customer:${updated.customerId.toString()}`)
          .emit('server:chat_session_expired_pending', {
            chatSessionId: updated._id.toString(),
            message:
              'We could not find an available agent for your chat request in time. Please try again later or leave an offline message.',
          });
      }
    }
  }

  /**
   * Notify eligible agents about visitor activity (connect/disconnect/reconnect)
   */
  async notifyAgentsAboutVisitor(
    customer: any,
    widget: any,
    domain: string,
    eventType:
      | 'visitor_connected'
      | 'visitor_disconnected'
      | 'visitor_reconnected',
  ) {
    try {
      if (!this.server) {
        this.logger.warn(
          'Socket.IO server not available for visitor notifications',
        );
        return;
      }

      // Get eligible agents for this widget and domain
      const eligibleAgents = await this.agentsService.getEligibleOnlineAgents(
        widget._id,
        domain,
      );

      if (eligibleAgents.length === 0) {
        this.logger.debug(
          `No eligible agents found for visitor notification on widget ${widget._id}`,
        );
        return;
      }

      // Prepare visitor data with full customer profile
      const visitorData = {
        customerId: customer._id.toString(),
        customerProfile: {
          name: customer.name || 'Anonymous Visitor',
          email: customer.email || null,
          phone: customer.phone || null,
          fingerprint: customer.fingerprint,
          metadata: customer.metadata || {},
        },
        widget: {
          id: widget._id.toString(),
          name: widget.name || 'Chat Widget',
          departmentIds:
            widget.departmentIds?.map((dept: any) => ({
              id: dept._id?.toString() || dept.toString(),
              name: dept.name || 'Unknown Department',
            })) || [],
        },
        domain: domain,
        currentPageUrl: customer.metadata?.currentPageUrl || 'unknown',
        browserInfo: customer.metadata?.browserInfo || {},
        timestamp: new Date(),
        eventType: eventType,
      };

      // Send notification to all eligible agents
      for (const agent of eligibleAgents) {
        this.server
          .to(`agent:${agent.userId.toString()}`)
          .emit('server:visitor_activity', visitorData);
      }

      this.logger.log(
        `Notified ${eligibleAgents.length} eligible agents about ${eventType} for customer ${customer._id} on widget ${widget._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify agents about visitor activity: ${error.message}`,
        error.stack,
      );
    }
  }
}
