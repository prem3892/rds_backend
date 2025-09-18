import { Injectable, Logger } from '@nestjs/common';
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
  private readonly agentInactivityThresholdMs: number;

  private server: Server | null = null;

  constructor(
    private readonly chatSessionService: ChatSessionService,
    private readonly agentsService: AgentsService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
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

  /**
   * Send priority notifications to eligible agents for a pending session
   * Called by JobsService
   */
  async sendPriorityNotificationToAgents(eligibleAgents: any[], session: any) {
    if (!this.server) {
      this.logger.warn(
        'Socket.IO server not available for priority notifications',
      );
      return;
    }

    for (const agent of eligibleAgents) {
      // server:priority_chat_notification (payload: ChatSession object)
      this.server
        .to(`agent:${agent.userId.toString()}`)
        .emit('server:priority_chat_notification', session);
    }

    this.logger.log(
      `Sent priority notifications to ${eligibleAgents.length} agents for session ${session._id}`,
    );
  }

  /**
   * Notify customer about expired session
   * Called by JobsService
   */
  async notifyCustomerAboutExpiredSession(session: any) {
    if (!this.server) {
      this.logger.warn(
        'Socket.IO server not available for expired session notifications',
      );
      return;
    }

    this.server
      .to(`customer:${session.customerId.toString()}`)
      .emit('server:chat_session_expired_pending', {
        chatSessionId: session._id.toString(),
        message:
          'We could not find an available agent for your chat request in time. Please try again later or leave an offline message.',
      });

    this.logger.log(
      `Notified customer ${session.customerId} about expired session ${session._id}`,
    );
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
   * Notify agent about customer inactivity
   * @param session The chat session where customer became inactive
   */
  async notifyAgentAboutCustomerInactivity(session: ChatSessionDocument) {
    try {
      if (!this.server) {
        this.logger.warn(
          'Socket.IO server not available for agent notifications',
        );
        return;
      }

      const agentId = session.agentId?.toString();
      if (!agentId) {
        this.logger.warn(
          `No agent assigned to session ${session._id} for customer inactivity notification`,
        );
        return;
      }

      // Get customer name for the notification
      const customer = session.customerId as any;
      const customerName = customer?.name || customer?.email || 'Customer';

      // Send notification to the assigned agent
      this.server.to(`agent:${agentId}`).emit('server:customer_inactive', {
        chatSessionId: session._id.toString(),
        message: `${customerName} has been inactive and the chat session has ended.`,
        customerId: session.customerId.toString(),
        customerName,
        sessionStatus: session.status,
      });

      this.logger.log(
        `Notified agent ${agentId} about customer inactivity in session ${session._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify agent about customer inactivity: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Notify an agent that their online status was changed by an admin
   * @param agentId The agent whose status was changed
   * @param isOnline The new online status
   * @param adminId The admin who made the change
   */
  async notifyAgentAboutStatusChangeByAdmin(
    agentId: string,
    isOnline: boolean,
    adminId: string,
  ) {
    try {
      if (!this.server) {
        this.logger.warn(
          'Socket.IO server not available for agent status change notification',
        );
        return;
      }

      // Send notification to the agent's room
      const notificationData = {
        success: true,
        isOnline: isOnline,
        changedByAdmin: true,
        adminId: adminId,
        timestamp: new Date().toISOString(),
      };

      this.server
        .to(`agent:${agentId}`)
        .emit('server:online_status_updated', notificationData);

      this.logger.log(
        `Notified agent ${agentId} about online status change to ${isOnline} by admin ${adminId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify agent ${agentId} about status change by admin: ${error.message}`,
      );
    }
  }

  /**
   * Notify the specific agent that their chat session has ended due to inactivity
   * @param agentId The ID of the agent whose chat ended
   * @param session The chat session that ended
   */
  async notifyAgentsAboutChatEnded(agentId: string, session: any) {
    try {
      if (!this.server) {
        this.logger.warn(
          'Socket.IO server not available for chat ended notifications',
        );
        return;
      }

      // Get customer name for the notification
      const customer = session.customerId as any;
      const customerName = customer?.name || customer?.email || 'Customer';

      // Prepare notification data (same payload as server:customer_inactive)
      const notificationData = {
        chatSessionId: session._id.toString(),
        message: `Chat session with ${customerName} has ended due to agent inactivity.`,
        customerId: session.customerId.toString(),
        customerName,
        sessionStatus: session.status,
      };

      // Send notification to the specific agent
      this.server
        .to(`agent:${agentId}`)
        .emit('server:chat_ended', notificationData);

      this.logger.log(
        `Notified agent ${agentId} about chat session ${session._id} ending due to agent inactivity`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify agent about chat ended: ${error.message}`,
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
