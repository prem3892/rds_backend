import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  Logger,
  UsePipes,
  ValidationPipe,
  Inject,
  forwardRef,
  UseFilters,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { ChatMessageService } from './services/chat-message/chat-message.service';
import { AgentsService } from '../agents/agents.service';
import { CustomersService } from '../customers/customers.service';
import { WidgetsService } from '../widgets/widgets.service';
import { DepartmentsService } from '../departments/departments.service';
import { RedisService } from '../shared/redis/redis.service';
import {
  UserRole,
  ChatSessionStatus,
  ChatMessageSenderType,
  ChatMessageType,
  REDIS_AGENT_RECONNECT_PENDING_PREFIX,
  REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX,
  VisitorEventType,
} from '../shared/constants/enums';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { InitiateChatDto } from './dto/initiate-chat.dto';
import { AgentInitiateChatDto } from './dto/agent-initiate-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConnectWidgetDto } from './dto/connect-widget.dto';
import { Types } from 'mongoose';
import { ChatSessionDocument } from 'src/schemas/chat-session.schema';
import { AllExceptionsFilter } from 'src/shared/filters/all-exceptions.filter';
import { AppointmentsService } from 'src/appointments/appointments.service';
import { UsersService } from '../users/users.service';
import { CreateAppointmentDto } from 'src/appointments/dto/create-appointment.dto';
import { IpExtractorUtil } from '../shared/utils/ip-extractor.util';
import { AppointmentDocument } from 'src/schemas/appointment.schema';
import { AgentProfileDocument } from 'src/schemas/agent-profile.schema';
import { ChatNotificationService } from './services/chat-notification/chat-notification.service';
import { VisitorStateService } from './services/visitor-state/visitor-state.service';
import { FingerprintUtil } from '../shared/utils/fingerprint.util';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload; // For agents
  customerId?: string; // For customers
}

@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => new WsException(errors),
  }),
)
@UseFilters(new AllExceptionsFilter()) // Apply a global WebSocket exception filter
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' }, // Configure appropriately for production
  // adapter: RedisAdapter, // This will be set in main.ts
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly agentReconnectTimeoutMs: number;
  private readonly customerReconnectTimeoutMs: number;
  private readonly customerAbandonTimeoutMs: number;
  private readonly visitorGracePeriodMs: number;

  constructor(
    private readonly authService: AuthService,
    private readonly chatSessionService: ChatSessionService,
    private readonly chatMessageService: ChatMessageService,
    @Inject(forwardRef(() => AgentsService))
    private readonly agentsService: AgentsService,
    private readonly customersService: CustomersService,
    private readonly widgetsService: WidgetsService,
    private readonly departmentsService: DepartmentsService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AppointmentsService))
    private readonly appointmentsService: AppointmentsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ChatNotificationService))
    private readonly chatNotificationService: ChatNotificationService,
    @Inject(forwardRef(() => VisitorStateService))
    private readonly visitorStateService: VisitorStateService,
  ) {
    this.agentReconnectTimeoutMs =
      this.configService.get<number>('chatTimers.agentReconnectTimeoutMs') ||
      600000;
    this.customerReconnectTimeoutMs =
      this.configService.get<number>('chatTimers.customerReconnectTimeoutMs') ||
      600000;
    this.customerAbandonTimeoutMs =
      this.configService.get<number>('chatTimers.customerAbandonTimeoutMs') ||
      600000;
    this.visitorGracePeriodMs =
      this.configService.get<number>('chatTimers.visitorGracePeriodMs') ||
      30000; // 30 seconds grace period for visitor reconnection
  }

  afterInit(server: Server) {
    this.logger.log('ChatGateway Initialized');
    // Set the server instance in the notification service to avoid circular dependency
    this.chatNotificationService.setServer(server);
    // Set the server instance in the visitor state service
    this.visitorStateService.setServer(server);
  }

  async handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    // Authentication will happen via specific events like agent:authenticate or customer:connect_widget
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const agentId = await this.redisService.getAgentIdBySocketId(client.id);
    if (agentId) {
      this.logger.log(`Agent ${agentId} disconnected with socket ${client.id}`);
      await this.handleAgentDisconnect(client, agentId);
    }

    const customerId = await this.redisService.getCustomerIdBySocketId(
      client.id,
    );
    if (customerId) {
      this.logger.log(
        `Customer ${customerId} disconnected with socket ${client.id}`,
      );
      await this.handleCustomerDisconnect(client, customerId);
    }
  }

  private async handleAgentDisconnect(
    client: AuthenticatedSocket,
    agentId: string,
  ) {
    // Use the new multi-socket removal method
    await this.redisService.removeAgentSocketMappingMulti(client.id, agentId);

    // Check if agent still has other connected sockets
    const hasOtherSockets = await this.redisService.hasAgentSockets(agentId);
    const remainingSocketCount =
      await this.redisService.getAgentSocketCount(agentId);

    this.logger.log(
      `Agent ${agentId} disconnected socket ${client.id}. Remaining sockets: ${remainingSocketCount}`,
    );

    if (!hasOtherSockets) {
      // Get current agent profile to check if they were online before disconnection
      const currentAgentProfile =
        await this.agentsService.findAgentProfileByUserId(agentId);
      const wasOnlineBeforeDisconnect = currentAgentProfile?.isOnline || false;

      // Store the previous online status in Redis for potential reconnection
      if (wasOnlineBeforeDisconnect) {
        await this.redisService.set(
          `agent_was_online:${agentId}`,
          'true',
          3600, // Store for 1 hour
        );
        this.logger.log(
          `Agent ${agentId} was online before disconnect. Storing previous state for reconnection.`,
        );
      }

      // Agent has no more connected sockets, mark as offline
      const agentProfile = await this.agentsService.setOnlineStatus(
        agentId,
        false,
      );
      this.logger.log(
        `Agent ${agentId} marked as offline (no remaining sockets).`,
      );
      client.leave(`agent:${agentId}`);
      // Leave organization-specific online agents room
      if (agentProfile?.adminId) {
        client.leave(`online_agents:${agentProfile.adminId.toString()}`);
      }
      this.broadcastAgentPoolStatusUpdateForAgent(agentProfile);

      const activeSessions =
        await this.chatSessionService.getActiveSessionsForAgent(agentId);
      for (const session of activeSessions) {
        await this.chatSessionService.updateSessionStatus(
          session._id,
          ChatSessionStatus.PENDING_AGENT_RECONNECT,
        );
        this.server
          .to(`customer:${session.customerId.toString()}`)
          .emit('server:agent_disconnected_from_chat', {
            chatSessionId: session._id.toString(),
            agentName: agentProfile?.userId
              ? (await this.usersService.findById(agentProfile.userId))
                  ?.firstName
              : 'Agent',
          });
        // Start timer for agent reconnect
        await this.redisService.set(
          `${REDIS_AGENT_RECONNECT_PENDING_PREFIX}${session._id.toString()}`,
          agentId,
          this.agentReconnectTimeoutMs / 1000, // TTL in seconds
        );
        this.scheduleAgentReconnectTimeout(
          session._id.toString(),
          agentId,
          this.agentReconnectTimeoutMs,
        );
        this.logger.log(
          `Session ${session._id} set to PENDING_AGENT_RECONNECT for agent ${agentId}. Reconnect timer started.`,
        );
      }
    } else {
      this.logger.log(
        `Agent ${agentId} still has ${remainingSocketCount} active socket(s). Not marking offline. Socket ${client.id} removed.`,
      );
      // Just remove this socket from the rooms, but don't change online status
      client.leave(`agent:${agentId}`);
      // Leave organization-specific online agents room
      const agentProfile =
        await this.agentsService.findAgentProfileByUserId(agentId);
      if (agentProfile?.adminId) {
        client.leave(`online_agents:${agentProfile.adminId.toString()}`);
      }
    }
  }

  private scheduleAgentReconnectTimeout(
    sessionId: string,
    agentId: string,
    timeoutMs: number,
  ) {
    setTimeout(async () => {
      const stillPending = await this.redisService.get(
        `${REDIS_AGENT_RECONNECT_PENDING_PREFIX}${sessionId}`,
      );
      if (stillPending === agentId) {
        // Agent did not reconnect in time
        this.logger.log(
          `Agent ${agentId} did not reconnect for session ${sessionId}. Abandoning.`,
        );
        const session = await this.chatSessionService.findById(sessionId);
        if (
          session &&
          session.status === ChatSessionStatus.PENDING_AGENT_RECONNECT
        ) {
          const updatedSession =
            await this.chatSessionService.updateSessionStatus(
              sessionId,
              ChatSessionStatus.ABANDONED_BY_AGENT,
            );
          this.server
            .to(`customer:${session.customerId.toString()}`)
            .emit('server:chat_session_update', {
              // Generic update or specific event
              chatSessionId: sessionId,
              status: ChatSessionStatus.ABANDONED_BY_AGENT,
              message:
                'The agent was disconnected and could not reconnect. You may try starting a new chat or leave an offline message.',
            });
          // Optionally, notify other agents if requeueing is implemented
        }
        await this.redisService.del(
          `${REDIS_AGENT_RECONNECT_PENDING_PREFIX}${sessionId}`,
        );
      }
    }, timeoutMs);
  }

  private async handleCustomerDisconnect(
    client: AuthenticatedSocket,
    customerId: string,
  ) {
    this.logger.log(
      `Starting customer disconnect handling for customer ${customerId} with socket ${client.id}`,
    );
    this.logger.debug(
      `[handleCustomerDisconnect] Initial state - customerId: ${customerId}, socketId: ${client.id}`,
    );

    try {
      // Use the new multi-socket removal method
      await this.redisService.removeCustomerSocketMappingMulti(
        client.id,
        customerId,
      );

      // Check if customer still has other connected sockets
      const hasOtherSockets =
        await this.redisService.hasCustomerSockets(customerId);
      const remainingSocketCount =
        await this.redisService.getCustomerSocketCount(customerId);

      this.logger.log(
        `Customer ${customerId} disconnected socket ${client.id}. Remaining sockets: ${remainingSocketCount}`,
      );

      // Always remove this socket from the room
      client.leave(`customer:${customerId}`);
      this.logger.debug(
        `[handleCustomerDisconnect] Socket ${client.id} removed from customer:${customerId} room`,
      );

      // Only proceed with full disconnect logic if customer has no remaining sockets
      if (hasOtherSockets) {
        this.logger.log(
          `Customer ${customerId} still has ${remainingSocketCount} active socket(s). Not triggering disconnect logic. Socket ${client.id} removed.`,
        );
        return; // Exit early - customer is still connected on other devices
      }

      this.logger.log(
        `Customer ${customerId} has no remaining sockets. Proceeding with full disconnect logic.`,
      );

      // Get customer details for visitor notification
      this.logger.debug(
        `[handleCustomerDisconnect] Fetching customer details for ${customerId}`,
      );
      const customer = await this.customersService.findById(customerId);

      if (!customer) {
        this.logger.warn(
          `[handleCustomerDisconnect] Customer ${customerId} not found in database`,
        );
      } else {
        this.logger.debug(
          `[handleCustomerDisconnect] Customer found - name: ${customer.name}, widgetId: ${customer.widgetId}`,
        );
      }

      // Immediately notify agents about visitor disconnection
      if (customer) {
        this.logger.debug(
          `[handleCustomerDisconnect] Processing visitor notification for customer ${customerId}`,
        );
        const widget = await this.widgetsService.findById(customer.widgetId);

        if (!widget) {
          this.logger.warn(
            `[handleCustomerDisconnect] Widget ${customer.widgetId} not found for customer ${customerId}`,
          );
        } else {
          this.logger.debug(
            `[handleCustomerDisconnect] Widget found - id: ${widget._id}, name: ${widget.name}`,
          );

          const domain = customer.metadata?.initialDomain || 'unknown';
          this.logger.debug(
            `[handleCustomerDisconnect] Notifying agents about visitor disconnect - domain: ${domain}`,
          );

          await this.visitorStateService.notifyAgentsAboutVisitor(
            customer,
            widget,
            domain,
            VisitorEventType.DISCONNECT,
          );
          this.logger.log(
            `Visitor disconnect notification sent for customer ${customerId} on domain ${domain}`,
          );

          // Set grace period timer for potential visitor reconnection
          const graceKey = `visitor_grace_period:${customerId}`;
          const graceData = JSON.stringify({
            customerId,
            widgetId: widget._id,
            domain,
          });

          this.logger.debug(
            `[handleCustomerDisconnect] Setting grace period timer - key: ${graceKey}, ttl: ${this.visitorGracePeriodMs / 1000}s`,
          );

          await this.redisService.set(
            graceKey,
            graceData,
            this.visitorGracePeriodMs / 1000, // TTL in seconds
          );
          this.logger.log(
            `Grace period timer set for customer ${customerId} (${this.visitorGracePeriodMs}ms)`,
          );
        }
      }

      // Find active/pending chats for this customer
      this.logger.debug(
        `[handleCustomerDisconnect] Fetching active sessions for customer ${customerId}`,
      );
      const sessions =
        await this.chatSessionService.getSessionsForCustomerReconnect(
          new Types.ObjectId(customerId),
        );

      this.logger.log(
        `Found ${sessions.length} active/pending sessions for customer ${customerId}`,
      );

      if (sessions.length === 0) {
        this.logger.debug(
          `[handleCustomerDisconnect] No active sessions found for customer ${customerId}`,
        );
      } else {
      }

      for (const session of sessions) {
        this.logger.debug(
          `[handleCustomerDisconnect] Processing session ${session._id} - status: ${session.status}, agentId: ${session.agentId}`,
        );

        // Update customer last seen timestamp
        await this.chatSessionService.updateCustomerLastSeen(session._id);
        this.logger.debug(
          `[handleCustomerDisconnect] Updated last seen timestamp for session ${session._id}`,
        );

        // Notify agent if assigned
        if (session.agentId) {
          const agentRoom = `agent:${session.agentId.toString()}`;
          const notificationData = {
            chatSessionId: session._id.toString(),
            customerName: customer?.name || 'Customer',
          };

          this.logger.debug(
            `[handleCustomerDisconnect] Notifying agent ${session.agentId} in room ${agentRoom}`,
          );

          this.server
            .to(agentRoom)
            .emit('server:customer_disconnected_from_chat', notificationData);

          this.logger.log(
            `Agent ${session.agentId} notified of customer ${customerId} disconnect from session ${session._id}`,
          );
        } else {
          this.logger.debug(
            `[handleCustomerDisconnect] No agent assigned to session ${session._id}`,
          );
        }

        // Start timer for customer reconnect
        const reconnectKey = `${REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${session._id.toString()}`;
        const reconnectTtl = this.customerReconnectTimeoutMs / 1000;

        this.logger.debug(
          `[handleCustomerDisconnect] Setting reconnect timer - key: ${reconnectKey}, ttl: ${reconnectTtl}s`,
        );

        await this.redisService.set(
          reconnectKey,
          customerId,
          reconnectTtl, // TTL in seconds
        );

        this.scheduleCustomerReconnectTimeout(
          session._id.toString(),
          customerId,
          this.customerReconnectTimeoutMs,
          this.customerAbandonTimeoutMs,
        );

        this.logger.log(
          `Customer ${customerId} disconnected from session ${session._id}. Reconnect timer started (${this.customerReconnectTimeoutMs}ms timeout, ${this.customerAbandonTimeoutMs}ms abandon timeout).`,
        );
      }

      this.logger.log(
        `Customer disconnect handling completed for customer ${customerId}. Processed ${sessions.length} sessions.`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling customer disconnect for ${customerId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private scheduleCustomerReconnectTimeout(
    sessionId: string,
    customerId: string,
    reconnectTimeoutMs: number,
    abandonTimeoutMs: number,
  ) {
    setTimeout(async () => {
      const stillPendingReconnect = await this.redisService.get(
        `${REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${sessionId}`,
      );
      if (stillPendingReconnect === customerId) {
        // Customer did not reconnect within the shorter window
        // Customer has not reconnected yet. Now wait for the longer abandon timeout.
        // The agent can still see the chat as "customer disconnected".
        // If the abandonTimeout is also reached, then mark as abandoned.
        // This logic is simplified here; a more robust system might have multiple timers or states.
        this.logger.log(
          `Customer ${customerId} reconnect timer expired for session ${sessionId}. Awaiting abandon timeout.`,
        );

        // Another timeout for abandonment
        setTimeout(async () => {
          const session = await this.chatSessionService.findById(sessionId);
          // Check if customer reconnected in the meantime (status changed) OR agent closed it
          if (
            session &&
            (session.status === ChatSessionStatus.ACTIVE ||
              session.status === ChatSessionStatus.PENDING_AGENT_RECONNECT)
          ) {
            // If still in these states and customerLastSeen is old enough
            if (
              session.customerLastSeen &&
              new Date().getTime() - session.customerLastSeen.getTime() >=
                abandonTimeoutMs
            ) {
              this.logger.log(
                `Customer ${customerId} abandon timeout reached for session ${sessionId}. Marking as abandoned.`,
              );
              const updatedSession =
                await this.chatSessionService.updateSessionStatus(
                  sessionId,
                  ChatSessionStatus.ABANDONED_BY_CUSTOMER,
                );
              if (updatedSession.agentId) {
                this.server
                  .to(`agent:${updatedSession.agentId.toString()}`)
                  .emit('server:chat_session_update', {
                    chatSessionId: sessionId,
                    status: ChatSessionStatus.ABANDONED_BY_CUSTOMER,
                    message:
                      'The customer was disconnected for an extended period and the chat has been marked as abandoned.',
                  });
              }
            }
          }
          await this.redisService.del(
            `${REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${sessionId}`,
          ); // Clean up key
        }, abandonTimeoutMs - reconnectTimeoutMs); // Remaining time for abandon
      }
    }, reconnectTimeoutMs);
  }

  // --- Agent Events ---
  @SubscribeMessage('agent:authenticate')
  async handleAgentAuthenticate(
    @MessageBody() data: { token: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ event: string; data: any }> {
    if (!data.token) {
      throw new WsException('Authentication token not provided.');
    }
    const jwtPayload = await this.authService.validateSocketToken(data.token);
    if (
      !jwtPayload ||
      (jwtPayload.role !== UserRole.ADMIN && jwtPayload.role !== UserRole.AGENT)
    ) {
      // Ensure it's an agent or admin
      this.logger.warn(
        `Agent authentication failed for socket ${client.id}. Invalid token or role.`,
      );
      client.emit('server:auth_failed', { message: 'Authentication failed.' });
      client.disconnect(true); // Force disconnect
      throw new WsException('Authentication failed.');
    }

    client.user = jwtPayload;
    await this.redisService.mapSocketIdToAgentIdMulti(
      client.id,
      jwtPayload.sub,
    );
    client.join(`agent:${jwtPayload.sub}`);

    const socketCount = await this.redisService.getAgentSocketCount(
      jwtPayload.sub,
    );
    this.logger.log(
      `Agent ${jwtPayload.sub} (${jwtPayload.email}) authenticated with socket ${client.id}. Total sockets: ${socketCount}`,
    );

    // Check for PENDING_AGENT_RECONNECT sessions for this agent
    const reconnectSessions =
      await this.chatSessionService.getSessionsForAgentReconnect(
        new Types.ObjectId(jwtPayload.sub),
      );
    for (const session of reconnectSessions) {
      this.logger.log(
        `Agent ${jwtPayload.sub} reconnected. Restoring session ${session._id}.`,
      );
      await this.redisService.del(
        `${REDIS_AGENT_RECONNECT_PENDING_PREFIX}${session._id.toString()}`,
      ); // Clear pending key

      const updatedSession = await this.chatSessionService.updateSessionStatus(
        session._id,
        ChatSessionStatus.ACTIVE,
      );
      await this.chatSessionService.updateAgentLastSeen(session._id);

      client.join(`chatSession:${session._id.toString()}`);
      // Also ensure customer is in the room if they are connected
      const customerSocketId = await this.redisService.getSocketIdByCustomerId(
        session.customerId.toString(),
      );
      if (customerSocketId) {
        try {
          const customerSockets = await this.server
            .in(customerSocketId)
            .fetchSockets();
          if (customerSockets.length > 0) {
            const customerClient = customerSockets[0];
            await customerClient.join(`chatSession:${session._id.toString()}`);
          }
        } catch (error) {
          this.logger.error(
            `Error adding customer socket ${customerSocketId} to chat session room: ${error.message}`,
          );
        }
      }

      this.server
        .to(`customer:${session.customerId.toString()}`)
        .emit('server:agent_reconnected_to_chat', {
          chatSessionId: session._id.toString(),
          agentName: jwtPayload.email, // Or fetch full name
        });
      // Send updated session details to agent
      this.server
        .to(`agent:${jwtPayload.sub}`)
        .emit('server:chat_session_restored', updatedSession);
    }

    // CRITICAL FIX: Join ALL active chat sessions for this agent
    // This ensures new device sockets are added to existing active chat rooms
    const activeSessions =
      await this.chatSessionService.getActiveSessionsForAgent(jwtPayload.sub);

    let joinedActiveSessionsCount = 0;
    for (const session of activeSessions) {
      // Skip sessions that were already handled in reconnect logic above
      const wasReconnectSession = reconnectSessions.some(
        (reconnectSession) =>
          reconnectSession._id.toString() === session._id.toString(),
      );

      if (!wasReconnectSession) {
        client.join(`chatSession:${session._id.toString()}`);
        joinedActiveSessionsCount++;
        this.logger.debug(
          `Agent ${jwtPayload.sub} socket ${client.id} joined existing active session ${session._id}`,
        );
      }
    }

    if (joinedActiveSessionsCount > 0) {
      this.logger.log(
        `Agent ${jwtPayload.sub} socket ${client.id} joined ${joinedActiveSessionsCount} existing active chat session(s)`,
      );
    }

    // Check if agent was online before disconnection and restore status if within shift
    const wasOnlineBeforeDisconnect = await this.redisService.get(
      `agent_was_online:${jwtPayload.sub}`,
    );
    if (wasOnlineBeforeDisconnect === 'true') {
      try {
        // Check if agent is currently within shift
        const availabilityStatus =
          await this.agentsService.isAgentCurrentlyAvailable(jwtPayload.sub);

        if (availabilityStatus.isWithinShift) {
          // Restore online status
          const agentProfile = await this.agentsService.setOnlineStatus(
            jwtPayload.sub,
            true,
          );
          // Join organization-specific online agents room
          if (agentProfile?.adminId) {
            client.join(`online_agents:${agentProfile.adminId.toString()}`);
          }
          this.broadcastAgentPoolStatusUpdateForAgent(agentProfile);

          this.logger.log(
            `Agent ${jwtPayload.sub} reconnected and restored to online status (within shift).`,
          );
        } else {
          this.logger.log(
            `Agent ${jwtPayload.sub} was online before disconnect but is now outside shift hours. Not restoring online status.`,
          );
        }

        // Clear the stored state regardless of whether we restored or not
        await this.redisService.del(`agent_was_online:${jwtPayload.sub}`);
      } catch (error) {
        this.logger.error(
          `Failed to restore online status for agent ${jwtPayload.sub}: ${error.message}`,
        );
        // Clear the stored state even if restoration failed
        await this.redisService.del(`agent_was_online:${jwtPayload.sub}`);
      }
    }

    return {
      event: 'server:authenticated',
      data: { userId: jwtPayload.sub, role: jwtPayload.role },
    };
  }

  @SubscribeMessage('agent:initiate_chat')
  async handleAgentInitiateChat(
    @MessageBody() payload: AgentInitiateChatDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ event: string; data: any }> {
    this.logger.debug(
      `agent:initiate_chat emitted by agent with data ${JSON.stringify(payload)}`,
    );

    // 1. Authentication check
    if (!client.user) {
      this.logger.error(
        `[handleAgentInitiateChat] Agent not authenticated ${JSON.stringify(client)}`,
      );
      throw new WsException('Agent not authenticated.');
    }

    const agentUserId = client.user.sub;

    // Get all agent sockets for multi-socket support
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);
    const socketCount = allAgentSockets.length;

    this.logger.log(
      `Agent ${agentUserId} attempting to initiate chat with customer ${payload.customerId} from socket ${client.id}. Total agent sockets: ${socketCount}`,
    );

    // 2. Get agent profile and check concurrent chat limits
    const agentProfile =
      await this.agentsService.findAgentProfileByUserIdOrFail(agentUserId);

    const activeChats = await this.chatSessionService.countActiveChatsForAgent(
      new Types.ObjectId(agentUserId),
    );

    if (activeChats >= agentProfile.maxConcurrentChats) {
      this.logger.warn(
        `Agent ${agentUserId} attempted to initiate chat but reached max concurrent chats (${agentProfile.maxConcurrentChats}).`,
      );
      throw new WsException(
        `Maximum concurrent chats limit reached (${agentProfile.maxConcurrentChats}).`,
      );
    }

    // 3. Widget access validation
    const accessCheck = await this.agentsService.canAgentAccessCustomer(
      agentUserId,
      payload.customerId,
    );

    if (!accessCheck.canAccess) {
      this.logger.warn(
        `Agent ${agentUserId} access denied for customer ${payload.customerId}: ${accessCheck.reason}`,
      );
      throw new WsException(`Access denied: ${accessCheck.reason}`);
    }

    const { customer, widget } = accessCheck;

    // 4. Check for existing active sessions
    const existingSession =
      await this.chatSessionService.findActiveSessionForCustomer(
        payload.customerId,
      );

    if (existingSession) {
      this.logger.warn(
        `Agent ${agentUserId} attempted to initiate chat with customer ${payload.customerId} who already has active session ${existingSession._id}`,
      );
      throw new WsException('Customer already has an active chat session.');
    }

    // 5. Create new chat session with agent pre-assigned
    const chatSession = await this.chatSessionService.initiateAgentChat(
      payload.customerId,
      agentUserId,
      widget,
      customer,
    );

    this.logger.log(
      `Agent ${agentUserId} successfully created chat session ${chatSession._id} with customer ${payload.customerId}`,
    );

    // 6. Join agent to chat session room
    client.join(`chatSession:${chatSession._id.toString()}`);

    // Join all agent sockets to the chat session room for multi-socket support
    for (const socketId of allAgentSockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(`chatSession:${chatSession._id.toString()}`);
      }
    }

    // 7. Create and send initial message from agent
    const initialMessage = await this.chatMessageService.createMessage({
      chatSessionId: chatSession._id,
      senderId: new Types.ObjectId(agentUserId),
      senderType: ChatMessageSenderType.AGENT,
      messageType: ChatMessageType.TEXT,
      content: { text: payload.initialMessage },
    });

    this.logger.debug(
      '[handleAgentInitiateChat]: sending initial message to session room',
      initialMessage,
    );

    // Broadcast the message to the chat session room
    this.server
      .to(`chatSession:${chatSession._id.toString()}`)
      .emit('server:new_message', initialMessage);

    // 8. Join customer to chat session room if they are online
    const customerSockets = await this.redisService.getAllSocketsForCustomer(
      payload.customerId,
    );
    if (customerSockets.length > 0) {
      this.logger.log(
        `Joining customer ${payload.customerId} to chat session ${chatSession._id} room. Customer has ${customerSockets.length} active socket(s).`,
      );

      // Join all customer sockets to the chat session room
      for (const socketId of customerSockets) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.join(`chatSession:${chatSession._id.toString()}`);
          this.logger.debug(
            `Customer socket ${socketId} joined chat session room`,
          );
        }
      }
    } else {
      this.logger.log(
        `Customer ${payload.customerId} is not currently online. They will join the chat session room when they connect.`,
      );
    }

    // 9. Notify customer about agent-initiated chat
    const agentUser = await this.usersService.findById(agentUserId);
    const agentName = agentUser ? agentUser.firstName : 'Agent';

    this.server
      .to(`customer:${payload.customerId}`)
      .emit('server:agent_initiated_chat', {
        chatSessionId: chatSession._id.toString(),
        agentName,
        agentId: agentUserId,
        initialMessage: payload.initialMessage,
        widget: {
          id: widget._id.toString(),
          name: widget.name,
          welcomeMessage: widget.welcomeMessage,
        },
        session: chatSession,
      });

    // 10. Prepare acknowledgment data
    const acknowledgmentData = {
      event: 'server:initiate_chat_ack',
      data: {
        chatSessionId: chatSession._id.toString(),
        status: 'CREATED',
        customer: {
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email,
        },
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
        initiatedAt: new Date(),
      },
    };

    // Broadcast acknowledgment to ALL agent's sockets
    this.server
      .to(`agent:${agentUserId}`)
      .emit(acknowledgmentData.event, acknowledgmentData.data);

    this.logger.log(
      `Agent ${agentUserId} successfully initiated chat session ${chatSession._id} with customer ${payload.customerId} from socket ${client.id}. Broadcasted to ${socketCount} socket(s).`,
    );

    // Return acknowledgment to the triggering socket
    return acknowledgmentData;
  }

  @SubscribeMessage('agent:set_online_status')
  async handleAgentSetOnlineStatus(
    @MessageBody() data: { isOnline: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (typeof data.isOnline !== 'boolean')
      throw new WsException('Invalid payload for online status.');

    const agentId = client.user.sub;
    const agentProfile = await this.agentsService.setOnlineStatus(
      agentId,
      data.isOnline,
    );

    // Get all sockets for this agent
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentId);

    this.logger.log(
      `Agent ${agentId} set online status to ${data.isOnline} from socket ${client.id}. Broadcasting to ${allAgentSockets.length} socket(s): [${allAgentSockets.join(', ')}]`,
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
          if (data.isOnline && organizationRoom) {
            await agentSocket.join(organizationRoom);
            this.logger.debug(
              `Socket ${socketId} joined '${organizationRoom}' room`,
            );
          } else if (!data.isOnline && organizationRoom) {
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

    // Broadcast acknowledgment to ALL agent's sockets (not just the triggering one)
    const acknowledgmentData = {
      event: 'server:online_status_updated',
      data: {
        isOnline: agentProfile.isOnline,
        triggeredBySocket: client.id, // Optional: let client know which device triggered the change
        totalSockets: allAgentSockets.length,
      },
    };

    // Send to all agent's sockets via the agent room
    this.server
      .to(`agent:${agentId}`)
      .emit(acknowledgmentData.event, acknowledgmentData.data);

    this.logger.log(
      `Sent online status acknowledgment to all sockets for agent ${agentId}. Status: ${data.isOnline}`,
    );

    // Broadcast pool status update to other clients
    this.broadcastAgentPoolStatusUpdateForAgent(agentProfile);

    // Return acknowledgment to the triggering socket (this is the traditional response)
    // Note: The triggering socket will receive this twice (once from room broadcast, once from return)
    // but that's acceptable for backward compatibility
    return acknowledgmentData;
  }

  private async broadcastAgentPoolStatusUpdateForAgent(agentProfile: any) {
    // For each department and domain this agent is associated with, calculate and emit.
    // This is a simplified broadcast; a more refined approach might target specific widgets.
    if (
      !agentProfile ||
      !agentProfile.departmentIds ||
      !Array.isArray(agentProfile.departmentIds) ||
      !agentProfile.domainAccess ||
      !Array.isArray(agentProfile.domainAccess)
    ) {
      this.logger.warn(
        `Cannot broadcast agent pool status update: invalid agent profile data`,
        {
          hasProfile: !!agentProfile,
          hasDepartmentIds: !!agentProfile?.departmentIds,
          isDepartmentIdsArray: Array.isArray(agentProfile?.departmentIds),
          hasDomainAccess: !!agentProfile?.domainAccess,
          isDomainAccessArray: Array.isArray(agentProfile?.domainAccess),
        },
      );
      return;
    }

    for (const deptId of agentProfile.departmentIds) {
      for (const domain of agentProfile.domainAccess) {
        try {
          // domain can be '*'
          // We need to find widgets associated with this department and domain
          const widgets = await this.widgetsService.findByDepartmentAndDomain(
            new Types.ObjectId(deptId),
            domain,
          );
          // If no widgets found, no need to continue
          if (widgets.length === 0) continue;

          // Use the first widget found to get eligible agents
          const onlineAgents = await this.agentsService.getEligibleOnlineAgents(
            widgets[0]._id,
            domain,
          );
          // This event is broad. Client widgets filter by departmentId and domain.
          this.server.to('/chat').emit('server:agent_pool_status_update', {
            departmentId: deptId.toString(),
            domain: domain, // Can be '*'
            onlineAgentsCount: onlineAgents.length,
            isAvailable: onlineAgents.length > 0,
          });

          this.logger.log(
            `Broadcasted agent pool status update for dept ${deptId} domain ${domain}: ${onlineAgents.length} agents available`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to broadcast agent pool status update for dept ${deptId} domain ${domain}`,
            error,
          );
        }
      }
    }
  }

  @SubscribeMessage('agent:accept_chat')
  async handleAgentAcceptChat(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.logger.debug(
      `agent:accept_chat emitted by agent with data ${JSON.stringify(data)}`,
    );
    if (!client.user) {
      this.logger.error(
        `[handleAgentAcceptChat] Agent not authenticated ${JSON.stringify(client)}`,
      );
      throw new WsException('Agent not authenticated.');
    }
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId)) {
      this.logger.error(`[handleAgentAcceptChat] Invalid chatSessionId`);
      throw new WsException('Invalid chatSessionId.');
    }

    const agentUserId = client.user.sub;

    // Get all sockets for this agent for multi-socket support
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);
    const socketCount = allAgentSockets.length;

    this.logger.log(
      `Agent ${agentUserId} attempting to accept chat ${data.chatSessionId} from socket ${client.id}. Total agent sockets: ${socketCount}`,
    );

    this.logger.debug(
      `[handleAgentAcceptChat] Fetching agent profile using ${agentUserId}`,
    );
    const agentProfile =
      await this.agentsService.findAgentProfileByUserIdOrFail(agentUserId);

    this.logger.debug(
      `[handleAgentAcceptChat] Agent profile ${JSON.stringify(agentProfile)}`,
    );
    const agentId = agentProfile.userId.toString();
    const activeChats = await this.chatSessionService.countActiveChatsForAgent(
      new Types.ObjectId(agentUserId),
    );

    if (activeChats >= agentProfile.maxConcurrentChats) {
      this.logger.warn(
        `Agent ${agentUserId} attempted to accept chat ${data.chatSessionId} but reached max concurrent chats (${agentProfile.maxConcurrentChats}).`,
      );

      // Broadcast max chats reached to ALL agent's sockets
      const maxChatsData = {
        chatSessionId: data.chatSessionId,
        maxChats: agentProfile.maxConcurrentChats,
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
      };

      this.server
        .to(`agent:${agentUserId}`)
        .emit('server:max_chats_reached', maxChatsData);

      throw new WsException(
        `You have reached your maximum limit of ${agentProfile.maxConcurrentChats} concurrent chats.`,
      );
    }

    this.logger.debug(
      `[handleAgentAcceptChat] Accepting chat by updating db record`,
    );
    const session = await this.chatSessionService.acceptChat(
      data.chatSessionId,
      agentId,
    );
    this.logger.debug(
      `[handleAgentAcceptChat] Accepted chat by updating db record ${JSON.stringify(session)}`,
    );

    if (session) {
      // Join ALL agent's sockets to the chat session room
      for (const socketId of allAgentSockets) {
        try {
          const sockets = await this.server.in(socketId).fetchSockets();
          if (sockets.length > 0) {
            const agentSocket = sockets[0];
            await agentSocket.join(`chatSession:${session._id.toString()}`);
            this.logger.debug(
              `Socket ${socketId} joined chatSession:${session._id.toString()}`,
            );
          } else {
            this.logger.warn(
              `Socket ${socketId} not found in server for agent ${agentUserId}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `Error joining socket ${socketId} to chat session room: ${error.message}`,
          );
        }
      }

      const customerSocketId = await this.redisService.getSocketIdByCustomerId(
        session.customerId._id.toString(),
      );
      if (customerSocketId) {
        this.logger.debug(
          `[handleAgentAcceptChat] customerSocketId ${customerSocketId}`,
        );
        const sockets = await this.server.in(customerSocketId).fetchSockets();

        // debug logs to print sockets metadata or details
        sockets.forEach((socket) => {
          this.logger.debug(
            `[handleAgentAcceptChat] ${socket.id}: ${JSON.stringify(socket.data)}: ${JSON.stringify(socket.rooms)}}}`,
          );
        });

        let customerClient;
        if (sockets) {
          customerClient = sockets[0];
        }
        if (customerClient) {
          this.logger.debug(
            `[handleAgentAcceptChat] Joining customer to session ${session._id.toString()}`,
          );
          customerClient.join(`chatSession:${session._id.toString()}`);
        }
      }

      const agentUser = await this.usersService.findById(agentUserId);
      this.logger.debug(
        `[handleAgentAcceptChat] Agent user ${JSON.stringify(agentUser)}`,
      );

      // Prepare acceptance data with multi-socket context
      const acceptanceData = {
        ...session.toObject(),
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
        acceptedAt: new Date(),
      };

      // Broadcast chat acceptance to ALL agent's sockets
      this.server
        .to(`agent:${agentUserId}`)
        .emit('server:chat_accepted_by_you', acceptanceData);

      // server:agent_details_on_accept (payload: { chatSessionId: string, agent: { name: string, avatarUrl?: string } })
      this.logger.debug(
        `[handleAgentAcceptChat] sending acceptance knowledge to customer ${session.customerId._id.toString()}`,
      );
      this.server
        .to(`customer:${session.customerId._id.toString()}`)
        .emit('server:agent_details_on_accept', {
          chatSessionId: session._id.toString(),
          agent: {
            name: agentUser
              ? `${agentUser.firstName} ${agentUser.lastName}`
              : 'Support Agent',
            // avatarUrl: agentUser.avatarUrl, // If you have avatars
          },
        });

      // Emit to other agents in the same organization that the chat is taken
      // Exclude ALL of the accepting agent's sockets, not just the triggering one
      let excludeSocketIds = allAgentSockets;
      const organizationRoom = agentProfile?.adminId
        ? `online_agents:${agentProfile.adminId.toString()}`
        : null;

      if (organizationRoom) {
        this.server
          .to(organizationRoom)
          .except(excludeSocketIds)
          .emit('server:chat_taken_or_resolved', {
            chatSessionId: session._id.toString(),
            acceptedByAgent: agentUser
              ? `${agentUser.firstName} ${agentUser.lastName}`
              : 'Support Agent',
          });
      }

      // System message to chat room
      const systemMessage = await this.chatMessageService.createMessage({
        chatSessionId: session._id,
        senderId: new Types.ObjectId(agentId), // System message attributed to agent action
        senderType: ChatMessageSenderType.SYSTEM,
        messageType: ChatMessageType.TEXT,
        content: {
          text: `${agentUser?.firstName || 'Agent'} has joined the chat.`,
        },
      });
      this.server
        .to(`chatSession:${session._id.toString()}`)
        .emit('server:new_message', systemMessage);

      this.logger.log(
        `Chat ${data.chatSessionId} successfully accepted by agent ${agentUserId} from socket ${client.id}. Broadcasted to ${socketCount} agent socket(s).`,
      );
    } else {
      // Chat was already accepted or status not PENDING_ASSIGNMENT
      const existingSession = await this.chatSessionService.findById(
        data.chatSessionId,
      );
      let acceptedByAgentName = 'another agent';
      if (existingSession && existingSession.agentId) {
        const acceptedAgentUser = await this.usersService.findById(
          existingSession.agentId._id,
        );
        if (acceptedAgentUser)
          acceptedByAgentName = `${acceptedAgentUser.firstName} ${acceptedAgentUser.lastName}`;
      }

      // Broadcast "already accepted" to ALL agent's sockets
      const alreadyAcceptedData = {
        chatSessionId: data.chatSessionId,
        acceptedByAgentName: acceptedByAgentName,
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
      };

      this.server
        .to(`agent:${agentUserId}`)
        .emit('server:chat_already_accepted', alreadyAcceptedData);

      this.logger.warn(
        `Agent ${agentId} tried to accept chat ${data.chatSessionId}, but it was already taken or not available. Broadcasted to ${socketCount} socket(s).`,
      );
    }

    // Prepare acknowledgment data with multi-socket context
    const acknowledgmentData = {
      event: 'server:accept_chat_ack',
      data: {
        chatSessionId: data.chatSessionId,
        success: !!session,
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
      },
    };

    // Send acknowledgment to ALL agent's sockets
    this.server
      .to(`agent:${agentUserId}`)
      .emit(acknowledgmentData.event, acknowledgmentData.data);

    // Return acknowledgment to the triggering socket (traditional response)
    return acknowledgmentData;
  }

  @SubscribeMessage('agent:send_message')
  async handleAgentSendMessage(
    @MessageBody() payload: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ event: string; data: any }> {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (
      !payload.chatSessionId ||
      !Types.ObjectId.isValid(payload.chatSessionId)
    ) {
      this.logger.error(
        `[handleAgentSendMessage] Invalid chatSessionId ${JSON.stringify(payload)}`,
      );
      throw new WsException('Invalid chatSessionId');
    }
    if (
      !payload.messageContent ||
      typeof payload.messageContent !== 'object' ||
      Object.keys(payload.messageContent).length === 0
    ) {
      this.logger.error(`[handleAgentSendMessage] Invalid message content`);
      throw new WsException('Invalid message content.');
    }

    const agentId = client.user.sub;
    const session = await this.chatSessionService.findByIdOrFail(
      payload.chatSessionId,
    );

    this.logger.debug(
      `[handleAgentSendMessage] Fetched session ${JSON.stringify(session)}`,
    );

    // Get agent profile by user id
    const agentProfile =
      await this.agentsService.findAgentProfileByUserId(agentId);
    const _agentId = (agentProfile?.userId as Types.ObjectId).toString();

    if (
      (_agentId && session.agentId?.toString() !== _agentId) ||
      session.status !== ChatSessionStatus.ACTIVE
    ) {
      this.logger.error(
        `[handleAgentSendMessage] Cannot send message to this session ${JSON.stringify(agentProfile)} and _id ${_agentId}`,
      );
      throw new WsException('Cannot send message to this session.');
    }

    // Get all sockets for this agent for multi-socket support
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentId);
    const socketCount = allAgentSockets.length;

    this.logger.log(
      `Agent ${agentId} sending message from socket ${client.id} to session ${payload.chatSessionId}. Total agent sockets: ${socketCount}`,
    );

    // Determine messageType based on content (simplified)
    let messageType = ChatMessageType.TEXT;
    if (
      payload.messageContent.url &&
      (payload.messageContent.filename ||
        payload.messageContent.mimetype?.startsWith('image'))
    ) {
      messageType = ChatMessageType.IMAGE; // Or FILE if not an image
    } else if (payload.messageContent.url && payload.messageContent.filename) {
      messageType = ChatMessageType.FILE;
    }

    const message = await this.chatMessageService.createMessage({
      chatSessionId: session._id,
      senderId: new Types.ObjectId(agentId),
      senderType: ChatMessageSenderType.AGENT,
      messageType: messageType,
      content: payload.messageContent,
    });
    await this.chatSessionService.updateLastMessageTimestamp(
      session._id,
      message.timestamp,
    );
    await this.chatSessionService.updateAgentLastSeen(session._id);

    // Broadcast the new message to the chat session (includes customer and all agent devices)
    this.server
      .to(`chatSession:${session._id.toString()}`)
      .emit('server:new_message', message);

    // Prepare acknowledgment data with multi-socket context
    const acknowledgmentData = {
      event: 'server:message_sent_ack',
      data: {
        messageId: message._id.toString(),
        timestamp: message.timestamp,
        triggeredBySocket: client.id, // Let other devices know which device sent the message
        totalAgentSockets: socketCount,
        chatSessionId: session._id.toString(),
      },
    };

    // Send acknowledgment to ALL agent's sockets via the agent room
    // This ensures all agent devices are notified that a message was sent
    this.server
      .to(`agent:${agentId}`)
      .emit(acknowledgmentData.event, acknowledgmentData.data);

    this.logger.log(
      `Message sent acknowledgment broadcasted to all ${socketCount} socket(s) for agent ${agentId}. Message ID: ${message._id}`,
    );

    // Return acknowledgment to the triggering socket (traditional response)
    // Note: The triggering socket will receive this twice (once from room broadcast, once from return)
    // but that's acceptable for backward compatibility and immediate feedback
    return acknowledgmentData;
  }

  @SubscribeMessage('agent:end_chat')
  async handleAgentEndChat(
    @MessageBody() data: { chatSessionId: string; reason?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const agentUserId = client.user.sub;
    const session = await this.chatSessionService.findByIdOrFail(
      data.chatSessionId,
    );

    const agentProfile =
      await this.agentsService.findAgentProfileByUserIdOrFail(agentUserId);

    // Get all sockets for this agent for multi-socket support
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);
    const socketCount = allAgentSockets.length;

    this.logger.log(
      `Agent ${agentUserId} attempting to end chat ${data.chatSessionId} from socket ${client.id}. Total agent sockets: ${socketCount}`,
    );

    this.logger.debug(
      `[handleAgentEndChat] Agent profile ${JSON.stringify(agentProfile)}`,
    );
    const agentId = (agentProfile.userId as Types.ObjectId).toString();
    if (session.agentId?.toString() !== agentId) {
      throw new WsException('You are not the agent for this chat.');
    }
    if (
      session.status === ChatSessionStatus.CLOSED_BY_AGENT ||
      session.status === ChatSessionStatus.CLOSED_BY_CUSTOMER
    ) {
      throw new WsException('Chat is already closed.');
    }

    const updatedSession = await this.chatSessionService.updateSessionStatus(
      session._id,
      ChatSessionStatus.CLOSED_BY_AGENT,
    );

    // Notify customer that agent ended the chat
    this.server
      .to(`customer:${session.customerId.toString()}`)
      .emit('server:agent_ended_chat', {
        chatSessionId: session._id.toString(),
        reason: data.reason,
      });

    const systemMessageContent = `Chat ended by agent. ${data.reason ? 'Reason: ' + data.reason : ''}`;
    const systemMessage = await this.chatMessageService.createMessage({
      chatSessionId: session._id,
      senderId: new Types.ObjectId(agentId), // System action by agent
      senderType: ChatMessageSenderType.SYSTEM,
      messageType: ChatMessageType.CHAT_ENDED_NOTICE,
      content: { text: systemMessageContent },
    });
    this.server
      .to(`chatSession:${session._id.toString()}`)
      .emit('server:new_message', systemMessage);

    // Remove participants from the room (updated for multi-socket)
    await this.removeParticipantsFromChatRoomMulti(
      session._id.toString(),
      agentUserId,
      session.customerId.toString(),
    );

    // Prepare acknowledgment data with multi-socket context
    const acknowledgmentData = {
      event: 'server:chat_ended_ack',
      data: {
        chatSessionId: session._id.toString(),
        reason: data.reason,
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
        endedAt: new Date(),
      },
    };

    // Broadcast chat ended acknowledgment to ALL agent's sockets
    this.server
      .to(`agent:${agentUserId}`)
      .emit(acknowledgmentData.event, acknowledgmentData.data);

    this.logger.log(
      `Agent ${agentId} ended chat ${session._id} from socket ${client.id}. Reason: ${data.reason || 'N/A'}. Broadcasted to ${socketCount} socket(s).`,
    );

    // Return acknowledgment to the triggering socket (traditional response)
    return acknowledgmentData;
  }

  @SubscribeMessage('agent:resolve_chat')
  async handleAgentResolveChat(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const agentUserId = client.user.sub;
    const session = await this.chatSessionService.findByIdOrFail(
      data.chatSessionId,
    );

    // Get agent profile for organization information
    const agentProfile =
      await this.agentsService.findAgentProfileByUserIdOrFail(agentUserId);

    // Get all sockets for this agent for multi-socket support
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);
    const socketCount = allAgentSockets.length;

    this.logger.log(
      `Agent ${agentUserId} attempting to resolve chat ${data.chatSessionId} from socket ${client.id}. Total agent sockets: ${socketCount}`,
    );

    if (session.agentId?.toString() !== agentUserId) {
      throw new WsException('You are not the agent for this chat.');
    }
    if (session.status === ChatSessionStatus.RESOLVED) {
      throw new WsException('Chat is already resolved.');
    }

    const updatedSession = await this.chatSessionService.updateSessionStatus(
      session._id,
      ChatSessionStatus.RESOLVED,
    );

    // Notify customer that agent resolved the chat
    this.server
      .to(`customer:${session.customerId.toString()}`)
      .emit('server:agent_resolved_chat', {
        chatSessionId: session._id.toString(),
        resolvedAt: new Date(),
      });

    const systemMessage = await this.chatMessageService.createMessage({
      chatSessionId: session._id,
      senderId: new Types.ObjectId(agentUserId),
      senderType: ChatMessageSenderType.SYSTEM,
      messageType: ChatMessageType.TEXT, // Or a specific RESOLVED_NOTICE type
      content: { text: 'Chat marked as resolved by agent.' },
    });
    this.server
      .to(`chatSession:${session._id.toString()}`)
      .emit('server:new_message', systemMessage);

    // Prepare acknowledgment data with multi-socket context
    const acknowledgmentData = {
      event: 'server:chat_resolved_ack',
      data: {
        chatSessionId: session._id.toString(),
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
        resolvedAt: new Date(),
      },
    };

    // Broadcast chat resolved acknowledgment to ALL agent's sockets
    this.server
      .to(`agent:${agentUserId}`)
      .emit(acknowledgmentData.event, acknowledgmentData.data);

    // Emit to other agents in the same organization that the chat is resolved
    // Exclude ALL of the resolving agent's sockets, not just the triggering one
    const organizationRoom = agentProfile?.adminId
      ? `online_agents:${agentProfile.adminId.toString()}`
      : null;

    if (organizationRoom) {
      this.server
        .to(organizationRoom)
        .except(allAgentSockets)
        .emit('server:chat_taken_or_resolved', {
          chatSessionId: session._id.toString(),
          status: 'resolved',
        });
    }

    // Participants remain in the room for resolved chats, unlike ended chats, unless specified otherwise.
    // For now, assume they stay for a bit or until explicitly left.
    this.logger.log(
      `Agent ${agentUserId} resolved chat ${session._id} from socket ${client.id}. Broadcasted to ${socketCount} socket(s).`,
    );

    // Return acknowledgment to the triggering socket (traditional response)
    return acknowledgmentData;
  }

  // --- Customer Events ---
  @SubscribeMessage('customer:connect_widget')
  async handleCustomerConnectWidget(
    @MessageBody() payload: ConnectWidgetDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ event: string; data: any }> {
    // Acknowledge with data
    this.logger.debug('customer:connect_widget emitted');

    //this.logger.debug(`[handleAgentAcceptChat] sockets.sockets ${this.server.allSockets}`);

    const sockets = await this.server.fetchSockets();

    // debug logs to print sockets metadata or details
    sockets.forEach((socket) => {
      this.logger.debug(
        `[handleCustomerConnectWidget] ${socket.id}: ${JSON.stringify(socket.data)}: ${JSON.stringify(socket.rooms)}}}`,
      );
    });

    if (!payload.widgetId || !Types.ObjectId.isValid(payload.widgetId))
      throw new WsException('Invalid widgetId.');
    if (!payload.browserInfo)
      throw new WsException('Browser information is required.');

    const widget = await this.widgetsService.findByIdPublic(payload.widgetId);
    if (!widget || !widget.isEnabled) {
      throw new WsException('Widget not found or disabled.');
    }
    // Domain check (optional here, primary check on widget load via HTTP)
    // if (!widget.domains.includes(payload.domain) && !widget.domains.includes('*')) {
    //   throw new WsException('Domain not authorized for this widget.');
    // }

    // Extract IP information from Cloudflare headers
    const ipInfo = IpExtractorUtil.extractIpInfo(client);

    this.logger.debug(
      `Extracted IP info: ${JSON.stringify(ipInfo)} for domain: ${payload.domain}`,
    );

    // Generate server-side fingerprint instead of trusting client
    const serverFingerprint = FingerprintUtil.generateFingerprint(
      payload.browserInfo,
      payload.domain,
      ipInfo,
    );

    this.logger.debug(
      `Generated server-side fingerprint: ${serverFingerprint} for domain: ${payload.domain}`,
    );

    const customer = await this.customersService.createOrUpdateCustomer({
      widgetId: new Types.ObjectId(payload.widgetId),
      fingerprint: serverFingerprint, // Use server-generated fingerprint
      customerId: payload.customerId,
      metadata: {
        browserInfo: payload.browserInfo,
        currentPageUrl: payload.currentPageUrl,
        initialDomain: payload.domain,
        clientFingerprint: payload.fingerprint, // Store client fingerprint for reference
        ipInfo: {
          clientIp: ipInfo.clientIp,
          country: ipInfo.country,
          city: ipInfo.city,
          cfRay: ipInfo.cfRay,
          isCloudflare: ipInfo.isCloudflare,
          proxyChain: ipInfo.proxyChain,
          timestamp: new Date(),
          isPrivate: IpExtractorUtil.isPrivateIp(ipInfo.clientIp),
        },
      },
    });

    // Check if customer is blocked
    if (customer.isBlocked) {
      throw new WsException('Access denied. Customer is blocked.');
    }

    client.customerId = customer._id.toString();
    await this.redisService.mapSocketIdToCustomerIdMulti(
      client.id,
      customer._id.toString(),
    );
    client.join(`customer:${customer._id.toString()}`);

    const socketCount = await this.redisService.getCustomerSocketCount(
      customer._id.toString(),
    );
    this.logger.log(
      `Customer ${customer._id} (server-fingerprint: ${serverFingerprint}) connected for widget ${payload.widgetId} with socket ${client.id}. IP: ${ipInfo.clientIp}${ipInfo.country ? ` (${ipInfo.country}${ipInfo.city ? `, ${ipInfo.city}` : ''})` : ''} via ${ipInfo.isCloudflare ? 'Cloudflare' : 'Direct'}. Total sockets: ${socketCount}`,
    );

    // Check if this is a reconnection during grace period
    const gracePeriodData = await this.redisService.get(
      `visitor_grace_period:${customer._id.toString()}`,
    );
    let isReconnection = false;
    if (gracePeriodData) {
      // Customer reconnected during grace period - notify agents about restoration
      await this.redisService.del(
        `visitor_grace_period:${customer._id.toString()}`,
      );
      await this.visitorStateService.notifyAgentsAboutVisitor(
        customer,
        widget,
        payload.domain,
        VisitorEventType.RECONNECT,
      );
      this.logger.log(
        `Customer ${customer._id} reconnected during grace period`,
      );
      isReconnection = true;
    }

    // Check for existing active/pending_reconnect sessions for this customer
    const reconnectSessions =
      await this.chatSessionService.getSessionsForCustomerReconnect(
        customer._id,
      );
    let activeSessionForReconnect: ChatSessionDocument | null = null;

    for (const session of reconnectSessions) {
      this.logger.log(
        `Customer ${customer._id} reconnected. Attempting to restore session ${session._id}.`,
      );
      await this.redisService.del(
        `${REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${session._id.toString()}`,
      ); // Clear pending key

      // If session was PENDING_AGENT_RECONNECT, it remains so until agent reconnects.
      // If it was ACTIVE, it becomes active again for customer.
      if (
        session.status === ChatSessionStatus.ACTIVE ||
        session.status === ChatSessionStatus.PENDING_AGENT_RECONNECT
      ) {
        activeSessionForReconnect = session; // Prioritize the most recent active one if multiple somehow exist

        await this.chatSessionService.updateCustomerLastSeen(session._id);
        client.join(`chatSession:${session._id.toString()}`);

        if (session.agentId) {
          const agentUser = await this.usersService.findById(session.agentId);
          this.server
            .to(`agent:${session.agentId.toString()}`)
            .emit('server:customer_reconnected_to_chat', {
              chatSessionId: session._id.toString(),
              customerName: customer.name || 'Customer',
            });
          // Send agent details again to customer if session is active
          if (session.status === ChatSessionStatus.ACTIVE && agentUser) {
            client.emit('server:agent_details_on_accept', {
              // Resend agent details
              chatSessionId: session._id.toString(),
              agent: { name: `${agentUser.firstName} ${agentUser.lastName}` },
            });
          }
        }
        this.logger.log(
          `Customer ${customer._id} re-joined chat session ${session._id}.`,
        );
        break; // Join first relevant session
      }
    }

    // Calculate initial agent availability for all departments of the widget
    let initialAgentAvailability: AgentProfileDocument[] = [];
    if (widget.departmentIds && Array.isArray(widget.departmentIds)) {
      const agents = await this.agentsService.getEligibleOnlineAgents(
        widget._id!, // _id can't be undefined
        payload.domain,
      );
      initialAgentAvailability = [...agents];
    }

    // Notify eligible agents about new visitor (regardless of new or existing session)
    // Only notify if this is not a grace period reconnection (already handled above)
    if (!isReconnection) {
      this.logger.log(
        `[DEBUG] Calling notifyAgentsAboutVisitor for customer ${customer._id}, widget ${widget._id}, domain ${payload.domain}`,
      );
      await this.visitorStateService.notifyAgentsAboutVisitor(
        customer,
        widget,
        payload.domain,
        VisitorEventType.CONNECT,
      );
      this.logger.log(
        `[DEBUG] Completed notifyAgentsAboutVisitor call for customer ${customer._id}`,
      );
    } else {
      this.logger.log(
        `[DEBUG] Skipping visitor notification for customer ${customer._id} - this is a reconnection`,
      );
    }

    return {
      event: 'server:widget_initialized',
      data: {
        customerId: customer._id.toString(),
        departments: (widget.departmentIds || []).map((dep: any) => ({
          id: dep._id.toString(),
          name: dep.name,
        })),
        initialAgentAvailability,
        widgetConfig: {
          primaryColor: widget.primaryColor,
          welcomeMessage: widget.welcomeMessage,
          headerText: widget.headerText,
        },
        activeSession: activeSessionForReconnect
          ? {
              // Send active session if reconnected
              chatSessionId: activeSessionForReconnect._id.toString(),
              status: activeSessionForReconnect.status,
              agent: activeSessionForReconnect.agentId
                ? {
                    name: (activeSessionForReconnect.agentId as any).firstName
                      ? `${(activeSessionForReconnect.agentId as any).firstName} ${(activeSessionForReconnect.agentId as any).lastName}`
                      : 'Support Agent',
                  }
                : null,
              // include last messages if needed for quick UI restore
            }
          : null,
      },
    };
  }

  @SubscribeMessage('customer:initiate_chat')
  async handleCustomerInitiateChat(
    @MessageBody() payload: InitiateChatDto, // ValidationPipe handles this
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.logger.debug(
      'customer:initiate_chat received from client with payload:',
      JSON.stringify(payload),
    );
    this.logger.debug('Client socket state:', {
      id: client.id,
      customerId: client.customerId,
      rooms: [...client.rooms],
    });
    if (!client.customerId)
      throw new WsException('Customer not identified. Connect widget first.');
    if (client.customerId !== payload.customerId)
      throw new WsException('customerId mismatch.');

    const customer = await this.customersService.findByIdOrFail(
      client.customerId,
    );

    // Check if customer is blocked
    if (customer.isBlocked) {
      throw new WsException('Access denied. Customer is blocked.');
    }

    const widget = await this.widgetsService.findById(payload.widgetId); // Ensure widget exists
    const currentPageUrl = customer.metadata?.currentPageUrl || 'unknown_page'; // Get from customer metadata
    const domain = new URL(currentPageUrl).hostname;

    const { session: chatSession, wasNew } =
      await this.chatSessionService.initiateChat(payload, domain, customer);

    if (!wasNew) {
      // Customer already had a pending/active session
      client.emit('server:chat_session_pending', {
        // Or appropriate event based on existing session status
        chatSessionId: chatSession._id.toString(),
        message: 'You already have an active chat session.',
        existingSession: chatSession, // Send full existing session data
      });
      // Ensure client joins the room if they weren't already in it
      client.join(`chatSession:${chatSession._id.toString()}`);

      // Create and send message from customer even for existing session
      const newMessage = await this.chatMessageService.createMessage({
        chatSessionId: chatSession._id,
        senderId: new Types.ObjectId(client.customerId),
        senderType: ChatMessageSenderType.CUSTOMER,
        messageType: ChatMessageType.TEXT,
        content: { text: payload.initialMessage },
      });

      this.logger.debug(
        '[handleCustomerInitiateChat]: sending message to existing session',
        newMessage,
      );
      this.server
        .to(`chatSession:${chatSession._id.toString()}`)
        .emit('server:new_message', newMessage);

      // If the session doesn't have an assigned agent or is in a pending state, notify eligible agents
      if (
        !chatSession.agentId ||
        chatSession.status === ChatSessionStatus.PENDING_ASSIGNMENT ||
        chatSession.status === ChatSessionStatus.PENDING_AGENT_RECONNECT
      ) {
        // Find eligible agents based on widget
        const eligibleAgents = await this.agentsService.getEligibleOnlineAgents(
          chatSession.widgetId,
          chatSession.domain,
        );

        if (eligibleAgents.length > 0) {
          this.logger.log(
            `Notifying ${eligibleAgents.length} eligible agents for existing chat session ${chatSession._id} that needs attention.`,
          );

          for (const agent of eligibleAgents) {
            this.server
              .to(`agent:${agent.userId.toString()}`)
              .emit('server:new_chat_request', chatSession); // Send full session
          }
        }
      }

      this.logger.log(
        `Customer ${client.customerId} attempted to initiate new chat, but existing session ${chatSession._id} found. Message saved and broadcasted.`,
      );
      return {
        event: 'server:initiate_chat_ack',
        data: { chatSessionId: chatSession._id.toString(), status: 'EXISTING' },
      };
    }

    // For new session
    client.join(`chatSession:${chatSession._id.toString()}`);

    // Create and send initial message from customer
    const initialMessage = await this.chatMessageService.createMessage({
      chatSessionId: chatSession._id,
      senderId: new Types.ObjectId(client.customerId),
      senderType: ChatMessageSenderType.CUSTOMER,
      messageType: ChatMessageType.TEXT,
      content: { text: payload.initialMessage },
    });

    this.logger.debug(
      '[handleCustomerInitiateChat]: sending message to session room',
      initialMessage,
    );
    this.server
      .to(`chatSession:${chatSession._id.toString()}`)
      .emit('server:new_message', initialMessage);

    // Find eligible agents based on widget
    const eligibleAgents = await this.agentsService.getEligibleOnlineAgents(
      chatSession.widgetId, // Use the widget ID which contains departmentIds
      chatSession.domain,
    );

    if (eligibleAgents.length === 0) {
      this.logger.warn(
        `No agents available for new chat session ${chatSession._id} in department ${(chatSession.departmentId as any).name}.`,
      );
      client.emit('server:no_agents_available_for_request', {
        departmentId: (chatSession.departmentId as any)._id.toString(),
      });
      // Optionally, update session status to OFFLINE_MESSAGE if that flow is chosen by client
    } else {
      this.logger.log(
        `Notifying ${eligibleAgents.length} eligible agents for new chat session ${chatSession._id}.`,
      );
      client.emit('server:chat_session_pending', {
        chatSessionId: chatSession._id.toString(),
        // estimatedWaitTime, queuePosition can be added here
      });
      for (const agent of eligibleAgents) {
        this.server
          .to(`agent:${agent.userId.toString()}`)
          .emit('server:new_chat_request', chatSession); // Send full session
      }
    }
    return {
      event: 'server:initiate_chat_ack',
      data: { chatSessionId: chatSession._id.toString(), status: 'CREATED' },
    };
  }

  @SubscribeMessage('customer:send_message')
  async handleCustomerSendMessage(
    @MessageBody() payload: SendMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ event: string; data: any }> {
    this.logger.debug(
      'customer:send_message emitted by customer with',
      payload,
      client.customerId,
    );
    // Ack
    if (!client.customerId) throw new WsException('Customer not identified.');

    // Check if customer is blocked
    const customer = await this.customersService.findById(client.customerId);
    if (customer && customer.isBlocked) {
      throw new WsException('Access denied. Customer is blocked.');
    }

    if (
      !payload.chatSessionId ||
      !Types.ObjectId.isValid(payload.chatSessionId)
    ) {
      this.logger.debug('[handleCustomerSendMessage]: Invalid chatSessionId');
      throw new WsException('Invalid chatSessionId');
    }

    if (
      !payload.messageContent ||
      typeof payload.messageContent !== 'object' ||
      Object.keys(payload.messageContent).length === 0
    ) {
      this.logger.debug(
        '[handleCustomerSendMessage]: Invalid message content.',
      );
      throw new WsException('Invalid message content.');
    }

    const session = await this.chatSessionService.findByIdOrFail(
      payload.chatSessionId,
    );
    if (session.customerId.toString() !== client.customerId) {
      this.logger.debug(
        '[handleCustomerSendMessage]: Cannot send message to this session or session not active.',
      );
      this.logger.debug(
        '[handleCustomerSendMessage]: session.customerId.toString(), client.customerId',
        session.customerId.toString(),
        client.customerId,
      );
      // Allow messages if agent is reconnecting
      throw new WsException(
        'Cannot send message to this session or session not active.',
      );
    }

    let messageType = ChatMessageType.TEXT;
    if (
      payload.messageContent.url &&
      (payload.messageContent.filename ||
        payload.messageContent.mimetype?.startsWith('image'))
    ) {
      messageType = ChatMessageType.IMAGE;
    } else if (payload.messageContent.url && payload.messageContent.filename) {
      messageType = ChatMessageType.FILE;
    }

    this.logger.debug('Creating customer message');
    const message = await this.chatMessageService.createMessage({
      chatSessionId: session._id,
      senderId: new Types.ObjectId(client.customerId),
      senderType: ChatMessageSenderType.CUSTOMER,
      messageType: messageType,
      content: payload.messageContent,
    });
    await this.chatSessionService.updateLastMessageTimestamp(
      session._id,
      message.timestamp,
    );
    await this.chatSessionService.updateCustomerLastSeen(session._id);

    this.server
      .to(`chatSession:${session._id.toString()}`)
      .emit('server:new_message', message);
    return {
      event: 'server:message_sent_ack',
      data: { messageId: message._id.toString(), timestamp: message.timestamp },
    };
  }

  // --- Agent Typing Events (Multi-Socket Support) ---
  @SubscribeMessage('agent:typing_start')
  async handleAgentTypingStart(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const agentUserId = client.user.sub;

    // Get all agent sockets to exclude ALL of them from the typing notification
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);

    this.logger.debug(
      `Agent ${agentUserId} started typing in chat ${data.chatSessionId} from socket ${client.id}. Excluding ${allAgentSockets.length} agent socket(s).`,
    );

    // Emit typing start to chat session, but exclude ALL agent sockets
    // This ensures the agent doesn't see their own typing indicator on any device
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(allAgentSockets)
      .emit('server:agent_typing_start', {
        chatSessionId: data.chatSessionId,
        agentId: agentUserId,
        triggeredBySocket: client.id,
      });

    // Optionally, send acknowledgment to ALL agent sockets
    // This lets all agent devices know that typing started from one of their devices
    this.server
      .to(`agent:${agentUserId}`)
      .emit('server:agent_typing_start_ack', {
        chatSessionId: data.chatSessionId,
        triggeredBySocket: client.id,
        totalAgentSockets: allAgentSockets.length,
      });
  }

  @SubscribeMessage('agent:typing_stop')
  async handleAgentTypingStop(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const agentUserId = client.user.sub;

    // Get all agent sockets to exclude ALL of them from the typing notification
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);

    this.logger.debug(
      `Agent ${agentUserId} stopped typing in chat ${data.chatSessionId} from socket ${client.id}. Excluding ${allAgentSockets.length} agent socket(s).`,
    );

    // Emit typing stop to chat session, but exclude ALL agent sockets
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(allAgentSockets)
      .emit('server:agent_typing_stop', {
        chatSessionId: data.chatSessionId,
        agentId: agentUserId,
        triggeredBySocket: client.id,
      });

    // Optionally, send acknowledgment to ALL agent sockets
    this.server
      .to(`agent:${agentUserId}`)
      .emit('server:agent_typing_stop_ack', {
        chatSessionId: data.chatSessionId,
        triggeredBySocket: client.id,
        totalAgentSockets: allAgentSockets.length,
      });
  }

  // --- Customer Typing Events (Multi-Socket Support) ---
  @SubscribeMessage('customer:typing_start')
  async handleCustomerTypingStart(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.customerId) throw new WsException('Customer not identified.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const customerId = client.customerId;

    // Get all customer sockets to exclude ALL of them from the typing notification
    const allCustomerSockets =
      await this.redisService.getAllSocketsForCustomer(customerId);

    this.logger.debug(
      `Customer ${customerId} started typing in chat ${data.chatSessionId} from socket ${client.id}. Excluding ${allCustomerSockets.length} customer socket(s).`,
    );

    // Emit typing start to chat session, but exclude ALL customer sockets
    // This ensures the customer doesn't see their own typing indicator on any device
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(allCustomerSockets)
      .emit('server:customer_typing_start', {
        chatSessionId: data.chatSessionId,
        customerId: customerId,
        triggeredBySocket: client.id,
      });

    // Optionally, send acknowledgment to ALL customer sockets
    // This lets all customer devices know that typing started from one of their devices
    this.server
      .to(`customer:${customerId}`)
      .emit('server:customer_typing_start_ack', {
        chatSessionId: data.chatSessionId,
        triggeredBySocket: client.id,
        totalCustomerSockets: allCustomerSockets.length,
      });
  }

  @SubscribeMessage('customer:typing_stop')
  async handleCustomerTypingStop(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.customerId) throw new WsException('Customer not identified.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const customerId = client.customerId;

    // Get all customer sockets to exclude ALL of them from the typing notification
    const allCustomerSockets =
      await this.redisService.getAllSocketsForCustomer(customerId);

    this.logger.debug(
      `Customer ${customerId} stopped typing in chat ${data.chatSessionId} from socket ${client.id}. Excluding ${allCustomerSockets.length} customer socket(s).`,
    );

    // Emit typing stop to chat session, but exclude ALL customer sockets
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(allCustomerSockets)
      .emit('server:customer_typing_stop', {
        chatSessionId: data.chatSessionId,
        customerId: customerId,
        triggeredBySocket: client.id,
      });

    // Optionally, send acknowledgment to ALL customer sockets
    this.server
      .to(`customer:${customerId}`)
      .emit('server:customer_typing_stop_ack', {
        chatSessionId: data.chatSessionId,
        triggeredBySocket: client.id,
        totalCustomerSockets: allCustomerSockets.length,
      });
  }

  @SubscribeMessage('customer:mark_messages_read')
  async handleCustomerMarkMessagesRead(
    @MessageBody()
    data: { chatSessionId: string; lastMessageTimestamp?: string }, // lastMessageTimestamp is optional
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.customerId) throw new WsException('Customer not identified.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const customerId = client.customerId;
    const upToTimestamp = data.lastMessageTimestamp
      ? new Date(data.lastMessageTimestamp)
      : new Date();
    if (isNaN(upToTimestamp.getTime()))
      throw new WsException('Invalid lastMessageTimestamp.');

    await this.chatMessageService.markMessagesAsReadByCustomer(
      data.chatSessionId,
      upToTimestamp,
    );

    // Get all customer sockets to exclude ALL of them from the read notification
    const allCustomerSockets =
      await this.redisService.getAllSocketsForCustomer(customerId);

    this.logger.debug(
      `Customer ${customerId} marked messages as read in chat ${data.chatSessionId} from socket ${client.id}. Excluding ${allCustomerSockets.length} customer socket(s).`,
    );

    // Emit read status to chat session, but exclude ALL customer sockets
    // This ensures the customer doesn't get read notifications on their other devices
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(allCustomerSockets)
      .emit('server:messages_read_by_customer', {
        chatSessionId: data.chatSessionId,
        upToTimestamp: upToTimestamp,
        triggeredBySocket: client.id,
      });

    // Send acknowledgment to ALL customer sockets
    // This syncs the read status across all customer devices
    this.server
      .to(`customer:${customerId}`)
      .emit('server:messages_read_by_customer_ack', {
        chatSessionId: data.chatSessionId,
        upToTimestamp: upToTimestamp,
        triggeredBySocket: client.id,
        totalCustomerSockets: allCustomerSockets.length,
      });
  }

  // @SubscribeMessage('agent:mark_messages_read')
  // async handleAgentMarkMessagesRead(
  //   @MessageBody()
  //   data: { chatSessionId: string; lastMessageTimestamp?: string },
  //   @ConnectedSocket() client: AuthenticatedSocket,
  // ) {
  //   if (!client.user) throw new WsException('Agent not authenticated.');
  //   if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
  //     throw new WsException('Invalid chatSessionId');

  //   const upToTimestamp = data.lastMessageTimestamp
  //     ? new Date(data.lastMessageTimestamp)
  //     : new Date();
  //   if (isNaN(upToTimestamp.getTime()))
  //     throw new WsException('Invalid lastMessageTimestamp.');

  //   await this.chatMessageService.markMessagesAsReadByAgent(
  //     data.chatSessionId,
  //     upToTimestamp,
  //   );
  //   this.server
  //     .to(`chatSession:${data.chatSessionId}`)
  //     .except(client.id)
  //     .emit('server:messages_read_by_agent', {
  //       chatSessionId: data.chatSessionId,
  //       upToTimestamp: upToTimestamp,
  //     });
  // }

  @SubscribeMessage('agent:mark_messages_read')
  async handleAgentMessageSeen(
    @MessageBody()
    data: { chatSessionId: string; messageId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');
    if (!data.messageId || !Types.ObjectId.isValid(data.messageId))
      throw new WsException('Invalid messageId');

    const agentUserId = client.user.sub;
    const now = new Date();

    // Get all agent sockets for multi-socket support
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);
    const socketCount = allAgentSockets.length;

    this.logger.log(
      `Agent ${agentUserId} marking messages as read in chat ${data.chatSessionId} from socket ${client.id}. Total agent sockets: ${socketCount}`,
    );

    // Mark the message as read by agent
    await this.chatMessageService.markMessagesAsReadByAgent(
      data.chatSessionId,
      now,
    );

    // Update agent's last seen timestamp
    await this.chatSessionService.updateAgentLastSeen(data.chatSessionId, now);

    // Notify the customer that the agent has seen the message
    // Exclude ALL agent sockets to prevent the agent from seeing their own read receipt
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(allAgentSockets)
      .emit('server:message_seen_by_agent', {
        chatSessionId: data.chatSessionId,
        messageId: data.messageId,
        timestamp: now,
        agentId: agentUserId,
      });

    // Prepare acknowledgment data with multi-socket context
    const acknowledgmentData = {
      event: 'server:messages_read_ack',
      data: {
        chatSessionId: data.chatSessionId,
        messageId: data.messageId,
        timestamp: now,
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
      },
    };

    // Broadcast read acknowledgment to ALL agent's sockets
    // This ensures all agent devices know that messages were marked as read
    this.server
      .to(`agent:${agentUserId}`)
      .emit(acknowledgmentData.event, acknowledgmentData.data);

    this.logger.debug(
      `Messages read acknowledgment broadcasted to ${socketCount} agent socket(s) for agent ${agentUserId}`,
    );

    // Return acknowledgment to the triggering socket (traditional response)
    return acknowledgmentData;
  }

  @SubscribeMessage('customer:mark_messages_read')
  async handleCustomerMessageSeen(
    @MessageBody()
    data: { chatSessionId: string; messageId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.customerId) throw new WsException('Customer not identified.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');
    if (!data.messageId || !Types.ObjectId.isValid(data.messageId))
      throw new WsException('Invalid messageId');

    const now = new Date();

    // Mark the message as read by customer
    await this.chatMessageService.markMessagesAsReadByCustomer(
      data.chatSessionId,
      now,
    );

    // Update customer's last seen timestamp
    await this.chatSessionService.updateCustomerLastSeen(
      data.chatSessionId,
      now,
    );

    // Notify the agent that the customer has seen the message
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(client.id)
      .emit('server:message_seen_by_customer', {
        chatSessionId: data.chatSessionId,
        messageId: data.messageId,
        timestamp: now,
      });
  }

  // --- Appointment Booking via Socket by Agent ---
  @SubscribeMessage('agent:book_appointment')
  async handleAgentBookAppointment(
    @MessageBody()
    payload: { chatSessionId: string; date: string; notes?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ): Promise<{ event: string; data: any }> {
    if (
      !client.user ||
      (client.user.role !== UserRole.AGENT &&
        client.user.role !== UserRole.ADMIN)
    )
      throw new WsException(
        'Only admin/agents can book appointments via this event.',
      );
    if (
      !payload.chatSessionId ||
      !Types.ObjectId.isValid(payload.chatSessionId)
    )
      throw new WsException('Invalid chatSessionId');

    const agentUserId = client.user.sub;

    // Get all agent sockets for multi-socket support
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);
    const socketCount = allAgentSockets.length;

    this.logger.log(
      `Agent ${agentUserId} booking appointment in chat ${payload.chatSessionId} from socket ${client.id}. Total agent sockets: ${socketCount}`,
    );

    this.logger.debug(
      `[handleAgentBookAppointment]: agent:book_appointment emitted by agent with payload ${JSON.stringify(payload)}`,
    );

    const chatSession = await this.chatSessionService.findById(
      payload.chatSessionId,
    );
    if (!chatSession) {
      throw new NotFoundException(
        `Chat session with ID ${payload.chatSessionId} not found.`,
      );
    }

    const customer = await this.customersService.findById(
      chatSession.customerId.toString(),
    );
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${chatSession.customerId} not found.`,
      );
    }

    // Get agent profile from client.user.sub
    const agent =
      await this.agentsService.findAgentProfileByUserId(agentUserId);
    if (!agent) throw new WsException('Agent not found.');

    const appointmentData: CreateAppointmentDto = {
      ...payload,
      agentId: (agent._id as Types.ObjectId).toString(),
      customerId: customer._id.toString(),
      appointmentTime: new Date(payload.date),
      notes: payload.notes ?? '',
    };

    const appointment = await this.appointmentsService.create(
      appointmentData,
      chatSession,
      client.user,
    );

    this.logger.debug(
      `[handleAgentBookAppointment]: appointment created ${JSON.stringify(appointment)}`,
    );

    // Notify customer about the appointment
    this.server
      .to(`customer:${chatSession.customerId.toString()}`)
      .emit('server:appointment_booked_notification', appointment);

    // Send a system message in chat
    const systemMessage = await this.chatMessageService.createMessage({
      chatSessionId: new Types.ObjectId(payload.chatSessionId),
      senderId: agent._id as Types.ObjectId, // System action by agent
      senderType: ChatMessageSenderType.SYSTEM,
      messageType: ChatMessageType.APPOINTMENT_BOOKED_NOTICE,
      content: {
        text: `An appointment has been scheduled for ${appointment.appointmentTime.toLocaleString()}.`,
        appointmentDetails: appointment.toObject(), // Send full appointment details
      },
    });
    this.server
      .to(`chatSession:${payload.chatSessionId}`)
      .emit('server:new_message', systemMessage);

    // Prepare acknowledgment data with multi-socket context
    const acknowledgmentData = {
      event: 'server:appointment_booked_ack',
      data: {
        appointment: appointment.toObject(),
        chatSessionId: payload.chatSessionId,
        triggeredBySocket: client.id,
        totalAgentSockets: socketCount,
        bookedAt: new Date(),
      },
    };

    // Broadcast appointment booked acknowledgment to ALL agent's sockets
    // This ensures all agent devices know that an appointment was booked
    this.server
      .to(`agent:${agentUserId}`)
      .emit(acknowledgmentData.event, acknowledgmentData.data);

    this.logger.log(
      `Agent ${agent._id} booked appointment ${appointment._id} for customer ${chatSession.customerId.toString()} in session ${payload.chatSessionId} from socket ${client.id}. Broadcasted to ${socketCount} socket(s).`,
    );

    // Return acknowledgment to the triggering socket (traditional response)
    return acknowledgmentData;
  }

  // --- Helper Methods ---
  private async removeParticipantsFromChatRoom(
    chatSessionId: string,
    agentSocketId: string,
    customerId: string,
  ) {
    // Remove agent from chat room
    try {
      const agentSockets = await this.server.in(agentSocketId).fetchSockets();
      if (agentSockets.length > 0) {
        const agentClient = agentSockets[0];
        await agentClient.leave(`chatSession:${chatSessionId}`);
      }
    } catch (error) {
      this.logger.error(
        `Error removing agent socket ${agentSocketId} from chat room: ${error.message}`,
      );
    }

    // Remove customer from chat room
    const customerSocketId =
      await this.redisService.getSocketIdByCustomerId(customerId);
    if (customerSocketId) {
      try {
        const customerSockets = await this.server
          .in(customerSocketId)
          .fetchSockets();
        if (customerSockets.length > 0) {
          const customerClient = customerSockets[0];
          await customerClient.leave(`chatSession:${chatSessionId}`);
        }
      } catch (error) {
        this.logger.error(
          `Error removing customer socket ${customerSocketId} from chat room: ${error.message}`,
        );
      }
    }
  }

  /**
   * Multi-socket version of removeParticipantsFromChatRoom
   * Removes ALL agent sockets from the chat room
   */
  private async removeParticipantsFromChatRoomMulti(
    chatSessionId: string,
    agentUserId: string,
    customerId: string,
  ) {
    // Remove ALL agent sockets from chat room
    const allAgentSockets =
      await this.redisService.getAllSocketsForAgent(agentUserId);

    this.logger.log(
      `Removing ${allAgentSockets.length} agent socket(s) from chatSession:${chatSessionId}`,
    );

    for (const socketId of allAgentSockets) {
      try {
        const agentSockets = await this.server.in(socketId).fetchSockets();
        if (agentSockets.length > 0) {
          const agentClient = agentSockets[0];
          await agentClient.leave(`chatSession:${chatSessionId}`);
          this.logger.debug(
            `Agent socket ${socketId} removed from chatSession:${chatSessionId}`,
          );
        } else {
          this.logger.warn(
            `Agent socket ${socketId} not found in server for removal from chat room`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error removing agent socket ${socketId} from chat room: ${error.message}`,
        );
      }
    }

    // Remove customer from chat room
    const customerSocketId =
      await this.redisService.getSocketIdByCustomerId(customerId);
    if (customerSocketId) {
      try {
        const customerSockets = await this.server
          .in(customerSocketId)
          .fetchSockets();
        if (customerSockets.length > 0) {
          const customerClient = customerSockets[0];
          await customerClient.leave(`chatSession:${chatSessionId}`);
          this.logger.debug(
            `Customer socket ${customerSocketId} removed from chatSession:${chatSessionId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error removing customer socket ${customerSocketId} from chat room: ${error.message}`,
        );
      }
    }
  }

  // --- Public methods for other services to call (e.g., ChatNotificationService) ---
  public sendPriorityChatNotification(
    agentId: string,
    session: ChatSessionDocument,
  ) {
    this.server
      .to(`agent:${agentId}`)
      .emit('server:priority_chat_notification', session);
  }

  public notifyCustomerSessionExpired(
    customerId: string,
    session: ChatSessionDocument,
  ) {
    this.server
      .to(`customer:${customerId}`)
      .emit('server:chat_session_expired_pending', {
        chatSessionId: session._id.toString(),
        message:
          'We could not find an available agent for your chat request in time. Please try again later or leave an offline message.',
      });
  }

  public emitSystemMessageToChat(
    chatSessionId: string,
    text: string,
    type: 'INFO' | 'WARNING' | 'ERROR' = 'INFO',
  ) {
    const systemMessagePayload = {
      chatSessionId: chatSessionId,
      text: text,
      type: type,
    };
    this.server
      .to(`chatSession:${chatSessionId}`)
      .emit('server:system_message', systemMessagePayload);
  }

  public notifyAppointmentBooked(appointment: AppointmentDocument) {
    // Notify customer via their private room
    this.server
      .to(`customer:${appointment.customerId.toString()}`)
      .emit('server:appointment_booked_notification', appointment);

    // Send a system message into the chat session
    const systemMessagePayload = {
      chatSessionId: appointment.chatSessionId.toString(),
      senderId: appointment.agentId, // Attributed to agent
      senderType: ChatMessageSenderType.SYSTEM,
      messageType: ChatMessageType.APPOINTMENT_BOOKED_NOTICE,
      content: {
        text: `An appointment has been scheduled by an agent for ${new Date(appointment.appointmentTime).toLocaleString()}.`,
        appointmentDetails: appointment.toObject(),
      },
      timestamp: new Date(),
    };
    this.server
      .to(`chatSession:${appointment.chatSessionId.toString()}`)
      .emit('server:new_message', systemMessagePayload);
  }
}
