import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from '../../../shared/redis/redis.service';
import { ChatNotificationService } from '../chat-notification/chat-notification.service';
import { AgentProfileDocument } from '../../../schemas/agent-profile.schema';

@Injectable()
export class AgentStatusNotificationService {
  private readonly logger = new Logger(AgentStatusNotificationService.name);
  private server: Server;

  constructor(
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => ChatNotificationService))
    private readonly chatNotificationService: ChatNotificationService,
  ) {}

  /**
   * Set the WebSocket server instance
   * This is called from the gateway after initialization to avoid circular dependencies
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Handle all socket notifications and room management when an agent's online status changes
   * This method contains the extracted logic from ChatGateway.handleAgentSetOnlineStatus
   */
  async notifyAgentStatusChange(
    agentId: string,
    isOnline: boolean,
    agentProfile: AgentProfileDocument,
    triggeredBySocket?: string,
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn(
        'WebSocket server not initialized. Cannot send socket notifications.',
      );
      return;
    }

    try {
      // Get all sockets for this agent
      const allAgentSockets =
        await this.redisService.getAllSocketsForAgent(agentId);

      this.logger.log(
        `Agent ${agentId} status changed to ${isOnline}. Broadcasting to ${allAgentSockets.length} socket(s): [${allAgentSockets.join(', ')}]`,
      );

      // Manage room membership for ALL agent's sockets
      const organizationRoom = agentProfile?.adminId
        ? `online_agents:${agentProfile.adminId.toString()}`
        : null;

      for (const socketId of allAgentSockets) {
        try {
          const sockets = await this.server.in(socketId).fetchSockets();
          if (sockets.length > 0) {
            const agentSocket = sockets[0]; // Should only be one socket with this ID
            if (isOnline && organizationRoom) {
              await agentSocket.join(organizationRoom);
              this.logger.debug(
                `Socket ${socketId} joined '${organizationRoom}' room`,
              );
            } else if (!isOnline && organizationRoom) {
              await agentSocket.leave(organizationRoom);
              this.logger.debug(
                `Socket ${socketId} left '${organizationRoom}' room`,
              );
            }
          } else {
            this.logger.warn(
              `Socket ${socketId} not found in server for agent ${agentId}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error managing room membership for socket ${socketId}: ${error.message}`,
          );
        }
      }

      // Broadcast acknowledgment to ALL agent's sockets
      const acknowledgmentData = {
        event: 'server:online_status_updated',
        data: {
          success: true,
          isOnline: agentProfile.isOnline,
          triggeredBySocket: triggeredBySocket || 'system', // 'system' for cron job triggers
          totalSockets: allAgentSockets.length,
        },
      };

      // Send to all agent's sockets via the agent room
      this.server
        .to(`agent:${agentId}`)
        .emit(acknowledgmentData.event, acknowledgmentData.data);

      this.logger.log(
        `Sent online status acknowledgment to all sockets for agent ${agentId}. Status: ${isOnline}`,
      );

      // Notify customers in active chat sessions with this agent
      await this.chatNotificationService.notifyCustomersOfAgentStatusChange(
        agentId,
        isOnline,
        agentProfile,
      );

      // Notify widget customers about agent status change
      await this.chatNotificationService.notifyWidgetCustomersOfAgentStatusChange(
        agentId,
        isOnline,
        agentProfile,
      );

      this.logger.log(
        `Successfully completed all notifications for agent ${agentId} status change to ${isOnline}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify agent status change for agent ${agentId}: ${error.message}`,
        error.stack,
      );

      // Broadcast error using the same event to ALL agent's sockets
      if (this.server) {
        const errorData = {
          event: 'server:online_status_updated',
          data: {
            success: false,
            error: error.message || 'Failed to update online status',
            requestedStatus: isOnline,
            triggeredBySocket: triggeredBySocket || 'system',
          },
        };

        // Send error to all agent's sockets via the agent room
        this.server
          .to(`agent:${agentId}`)
          .emit(errorData.event, errorData.data);

        this.logger.log(
          `Sent online status error to all sockets for agent ${agentId}. Error: ${error.message}`,
        );
      }
    }
  }
}
