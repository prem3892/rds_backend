import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';

import { ChatSessionStatus } from 'src/shared/constants/enums';
import { ChatSessionService } from '../chat-session/chat-session.service';
import { AgentsService } from 'src/agents/agents.service';
import { WidgetsService } from 'src/widgets/widgets.service';
import { ChatSessionDocument } from 'src/schemas/chat-session.schema';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ChatNotificationService {
  private readonly logger = new Logger(ChatNotificationService.name);
  private readonly firstAlertThresholdMs: number;
  private readonly subsequentAlertIntervalMs: number;
  private readonly maxPriorityAlerts: number;
  private readonly agentInactivityThresholdMs: number;

  private server: Server | null = null;

  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly agentsService: AgentsService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    this.firstAlertThresholdMs =
      this.configService.get<number>('chatTimers.firstAlertThresholdMs') ||
      60000;
    this.subsequentAlertIntervalMs =
      this.configService.get<number>('chatTimers.subsequentAlertIntervalMs') ||
      60000;
    this.maxPriorityAlerts =
      this.configService.get<number>('chatTimers.maxPriorityAlerts') || 3;
    this.agentInactivityThresholdMs =
      this.configService.get<number>('chatTimers.agentInactivityThresholdMs') ||
      180000; // Default to 3 minutes
  }

  /**
   * Set the Socket.IO server instance (called from ChatGateway)
   */
  setServer(server: Server) {
    this.server = server;
  }

  @Cron(CronExpression.EVERY_5_MINUTES) // Configurable
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

  /**
   * Notify customer that the agent has become inactive
   * @param session The chat session
   */
  async notifyCustomerAboutAgentInactivity(session: ChatSessionDocument) {
    try {
      if (!this.server) {
        this.logger.warn(
          'Socket.IO server not available for customer notifications',
        );
        return;
      }

      const customerId = session.customerId.toString();

      // Find the inactive agent from agent history
      const inactiveAgent = session.agentHistory?.find(
        (agent) => !agent.isActive && !agent.leftAt,
      );

      if (!inactiveAgent) {
        this.logger.warn(
          `No inactive agent found in history for session ${session._id}`,
        );
        return;
      }

      // Get agent name for the notification
      const agentUser = await this.usersService.findById(inactiveAgent.agentId);
      const agentName = agentUser?.firstName || 'Agent';

      // Send notification to customer
      this.server.to(`customer:${customerId}`).emit('server:agent_inactive', {
        chatSessionId: session._id.toString(),
        message: `${agentName} is no longer available. We're connecting you with another agent.`,
        inactiveAgentId: inactiveAgent.agentId.toString(),
        inactiveAgentName: agentName,
        inactivityDuration: Math.floor(this.agentInactivityThresholdMs / 60000), // in minutes
      });

      this.logger.log(
        `Notified customer ${customerId} about agent ${inactiveAgent.agentId} inactivity in session ${session._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify customer about agent inactivity: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Notify available agents about a pending chat that needs reassignment
   * @param session The chat session that needs a new agent
   */
  async notifyAgentsAboutPendingChat(session: ChatSessionDocument) {
    try {
      if (!this.server) {
        this.logger.warn(
          'Socket.IO server not available for agent notifications',
        );
        return;
      }

      // Get eligible agents for this widget and domain
      const eligibleAgents = await this.agentsService.getEligibleOnlineAgents(
        session.widgetId,
        session.domain,
      );

      if (eligibleAgents.length === 0) {
        this.logger.debug(
          `No eligible agents found for pending chat notification for session ${session._id}`,
        );
        return;
      }

      // Get previous agent info for context
      const previousAgentHistory = session.agentHistory?.find(
        (agent) => !agent.isActive && agent.leftAt,
      );

      let previousAgentInfo: {
        id: string;
        name: string;
        inactivityDuration: number;
      } | null = null;

      if (previousAgentHistory) {
        const previousAgent = await this.usersService.findById(
          previousAgentHistory.agentId,
        );
        if (previousAgent) {
          previousAgentInfo = {
            id: previousAgent._id.toString(),
            name: previousAgent.firstName,
            inactivityDuration: Math.floor(
              this.agentInactivityThresholdMs / 60000,
            ), // in minutes
          };
        }
      }

      // Prepare notification data
      const notificationData = {
        chatSessionId: session._id.toString(),
        customerName:
          typeof session.customerId === 'object' && 'name' in session.customerId
            ? session.customerId.name || 'Customer'
            : 'Customer',
        initialMessage: session.initialMessage,
        waitingTime: Math.floor(
          (Date.now() - session.initiatedAt.getTime()) / 60000,
        ), // in minutes
        previousAgent: previousAgentInfo,
        priority: true, // Mark as priority since it's a reassignment
        reassignment: true,
      };

      // Send notification to all eligible agents
      for (const agent of eligibleAgents) {
        // Skip the previous agent who was inactive
        if (
          previousAgentHistory &&
          agent.userId.toString() === previousAgentHistory.agentId.toString()
        ) {
          continue;
        }

        this.server
          .to(`agent:${agent.userId.toString()}`)
          .emit('server:pending_chat_notification', notificationData);
      }

      this.logger.log(
        `Notified ${eligibleAgents.length} eligible agents about pending chat session ${session._id} that needs reassignment`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify agents about pending chat: ${error.message}`,
        error.stack,
      );
    }
  }
}
