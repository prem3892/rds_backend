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
import { SendMessageDto } from './dto/send-message.dto';
import { ConnectWidgetDto } from './dto/connect-widget.dto';
import { Types } from 'mongoose';
import { ChatSessionDocument } from 'src/schemas/chat-session.schema';
import { AllExceptionsFilter } from 'src/shared/filters/all-exceptions.filter';
import { AppointmentsService } from 'src/appointments/appointments.service';
import { UsersService } from '../users/users.service';
import { CreateAppointmentDto } from 'src/appointments/dto/create-appointment.dto';
import { AppointmentDocument } from 'src/schemas/appointment.schema';
import { AgentProfileDocument } from 'src/schemas/agent-profile.schema';
import { ChatNotificationService } from './services/chat-notification/chat-notification.service';
import { VisitorStateService } from './services/visitor-state/visitor-state.service';

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
    await this.redisService.removeAgentSocketMapping(client.id, agentId);

    // Only set offline if this was their last/only connected socket
    // For simplicity, current model assumes one socket per agent for chat activity
    const stillConnectedSocketId =
      await this.redisService.getSocketIdByAgentId(agentId);
    if (!stillConnectedSocketId || stillConnectedSocketId === client.id) {
      // Check if it's the same socket being removed
      const agentProfile = await this.agentsService.setOnlineStatus(
        agentId,
        false,
      );
      this.logger.log(`Agent ${agentId} marked as offline.`);
      client.leave(`agent:${agentId}`);
      client.leave('online_agents'); // Using socket.io rooms
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
        `Agent ${agentId} has other active sockets. Not marking offline. Socket ${client.id} removed.`,
      );
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
    await this.redisService.removeCustomerSocketMapping(client.id, customerId);
    client.leave(`customer:${customerId}`);

    // Get customer details for visitor notification
    const customer = await this.customersService.findById(customerId);

    // Immediately notify agents about visitor disconnection
    if (customer) {
      const widget = await this.widgetsService.findById(customer.widgetId);
      if (widget) {
        const domain = customer.metadata?.initialDomain || 'unknown';
        await this.visitorStateService.notifyAgentsAboutVisitor(
          customer,
          widget,
          domain,
          VisitorEventType.DISCONNECT,
        );

        // Set grace period timer for potential visitor reconnection
        await this.redisService.set(
          `visitor_grace_period:${customerId}`,
          JSON.stringify({ customerId, widgetId: widget._id, domain }),
          this.visitorGracePeriodMs / 1000, // TTL in seconds
        );
      }
    }

    // Find active/pending chats for this customer
    const sessions =
      await this.chatSessionService.getSessionsForCustomerReconnect(
        new Types.ObjectId(customerId),
      );

    for (const session of sessions) {
      await this.chatSessionService.updateCustomerLastSeen(session._id);
      if (session.agentId) {
        this.server
          .to(`agent:${session.agentId.toString()}`)
          .emit('server:customer_disconnected_from_chat', {
            chatSessionId: session._id.toString(),
            customerName: customer?.name || 'Customer',
          });
      }
      // Start timer for customer reconnect
      await this.redisService.set(
        `${REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${session._id.toString()}`,
        customerId,
        this.customerReconnectTimeoutMs / 1000, // TTL in seconds
      );
      this.scheduleCustomerReconnectTimeout(
        session._id.toString(),
        customerId,
        this.customerReconnectTimeoutMs,
        this.customerAbandonTimeoutMs,
      );
      this.logger.log(
        `Customer ${customerId} disconnected from session ${session._id}. Reconnect timer started.`,
      );
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
    await this.redisService.mapSocketIdToAgentId(client.id, jwtPayload.sub);
    client.join(`agent:${jwtPayload.sub}`);
    this.logger.log(
      `Agent ${jwtPayload.sub} (${jwtPayload.email}) authenticated with socket ${client.id}`,
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
        // Fix for "Cannot read properties of undefined (reading 'get')" error
        let customerClient;
        if (this.server.sockets && this.server.sockets.sockets) {
          customerClient = this.server.sockets.sockets.get(customerSocketId);
        }
        if (customerClient)
          customerClient.join(`chatSession:${session._id.toString()}`);
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

    return {
      event: 'server:authenticated',
      data: { userId: jwtPayload.sub, role: jwtPayload.role },
    };
  }

  @SubscribeMessage('agent:set_online_status')
  async handleAgentSetOnlineStatus(
    @MessageBody() data: { isOnline: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (typeof data.isOnline !== 'boolean')
      throw new WsException('Invalid payload for online status.');

    const agentProfile = await this.agentsService.setOnlineStatus(
      client.user.sub,
      data.isOnline,
    );
    this.logger.log(
      `Agent ${client.user.sub} set online status to ${data.isOnline}`,
    );

    if (data.isOnline) {
      client.join('online_agents');
    } else {
      client.leave('online_agents');
      // Additional logic for when agent goes offline during active chats is handled in handleDisconnect
    }
    // Broadcast pool status update
    this.broadcastAgentPoolStatusUpdateForAgent(agentProfile);

    return {
      event: 'server:online_status_updated',
      data: { isOnline: agentProfile.isOnline },
    };
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
      `agent:accept_chat emiited by agent with data ${JSON.stringify(data)}`,
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

    this.logger.debug(
      `[handleAgentAcceptChat] Fetching agent profile using ${agentUserId}`,
    );
    const agentProfile =
      await this.agentsService.findAgentProfileByUserIdOrFail(agentUserId);

    this.logger.debug(
      `[handleAgentAcceptChat] Agent profile ${JSON.stringify(agentProfile)}`,
    );
    const agentId = (agentProfile._id as Types.ObjectId).toString();
    const activeChats = await this.chatSessionService.countActiveChatsForAgent(
      new Types.ObjectId(agentUserId),
    );

    if (activeChats >= agentProfile.maxConcurrentChats) {
      this.logger.warn(
        `Agent ${agentUserId} attempted to accept chat ${data.chatSessionId} but reached max concurrent chats (${agentProfile.maxConcurrentChats}).`,
      );
      client.emit('server:max_chats_reached', {
        chatSessionId: data.chatSessionId,
        maxChats: agentProfile.maxConcurrentChats,
      });
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
      client.join(`chatSession:${session._id.toString()}`);
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

      // server:chat_accepted_by_you (payload: ChatSession object, Customer details)
      client.emit('server:chat_accepted_by_you', session);

      // server:agent_details_on_accept (payload: { chatSessionId: string, agent: { name: string, avatarUrl?: string } })
      this.logger.debug(
        `[handleAgentAcceptChat] sending acceptence knowledge to customer ${session.customerId._id.toString()}`,
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

      // Emit to other agents that the chat is taken
      this.server
        .to('online_agents')
        .except(client.id)
        .emit('server:chat_taken_or_resolved', {
          chatSessionId: session._id.toString(),
        });

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
      client.emit('server:chat_already_accepted', {
        chatSessionId: data.chatSessionId,
        acceptedByAgentName: acceptedByAgentName,
      });
      this.logger.warn(
        `Agent ${agentId} tried to accept chat ${data.chatSessionId}, but it was already taken or not available.`,
      );
    }
    return {
      event: 'server:accept_chat_ack',
      data: { chatSessionId: data.chatSessionId, success: !!session },
    };
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

    const session = await this.chatSessionService.findByIdOrFail(
      payload.chatSessionId,
    );

    this.logger.debug(
      `[handleAgentSendMessage] Fetched seesion ${JSON.stringify(session)}`,
    );

    // Get agent profile by user id
    const agentProfile = await this.agentsService.findAgentProfileByUserId(
      client.user.sub,
    );
    const _agentId = (agentProfile?._id as Types.ObjectId).toString();

    if (
      (_agentId && session.agentId?.toString() !== _agentId) ||
      session.status !== ChatSessionStatus.ACTIVE
    ) {
      this.logger.error(
        `[handleAgentSendMessage] Cannot send message to this session ${JSON.stringify(agentProfile)} and _id ${_agentId}`,
      );
      throw new WsException('Cannot send message to this session.');
    }

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
      senderId: new Types.ObjectId(client.user.sub),
      senderType: ChatMessageSenderType.AGENT,
      messageType: messageType,
      content: payload.messageContent,
    });
    await this.chatSessionService.updateLastMessageTimestamp(
      session._id,
      message.timestamp,
    );
    await this.chatSessionService.updateAgentLastSeen(session._id);

    this.server
      .to(`chatSession:${session._id.toString()}`)
      .emit('server:new_message', message);
    return {
      event: 'server:message_sent_ack',
      data: { messageId: message._id.toString(), timestamp: message.timestamp },
    };
  }

  @SubscribeMessage('agent:end_chat')
  async handleAgentEndChat(
    @MessageBody() data: { chatSessionId: string; reason?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const session = await this.chatSessionService.findByIdOrFail(
      data.chatSessionId,
    );

    const agentProfile =
      await this.agentsService.findAgentProfileByUserIdOrFail(client.user.sub);

    this.logger.debug(
      `[handleAgentEndChat] Agent profile ${JSON.stringify(agentProfile)}`,
    );
    const agentId = (agentProfile._id as Types.ObjectId).toString();
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

    this.server
      .to(`customer:${session.customerId.toString()}`)
      .emit('server:agent_ended_chat', {
        chatSessionId: session._id.toString(),
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

    // Remove participants from the room
    this.removeParticipantsFromChatRoom(
      session._id.toString(),
      client.id,
      session.customerId.toString(),
    );
    this.logger.log(
      `Agent ${agentId} ended chat ${session._id}. Reason: ${data.reason || 'N/A'}`,
    );
    return {
      event: 'server:chat_ended_ack',
      data: { chatSessionId: session._id.toString() },
    };
  }

  @SubscribeMessage('agent:resolve_chat')
  async handleAgentResolveChat(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const session = await this.chatSessionService.findByIdOrFail(
      data.chatSessionId,
    );
    if (session.agentId?.toString() !== client.user.sub) {
      throw new WsException('You are not the agent for this chat.');
    }
    if (session.status === ChatSessionStatus.RESOLVED) {
      throw new WsException('Chat is already resolved.');
    }

    const updatedSession = await this.chatSessionService.updateSessionStatus(
      session._id,
      ChatSessionStatus.RESOLVED,
    );
    this.server
      .to(`customer:${session.customerId.toString()}`)
      .emit('server:agent_resolved_chat', {
        chatSessionId: session._id.toString(),
      });

    const systemMessage = await this.chatMessageService.createMessage({
      chatSessionId: session._id,
      senderId: new Types.ObjectId(client.user.sub),
      senderType: ChatMessageSenderType.SYSTEM,
      messageType: ChatMessageType.TEXT, // Or a specific RESOLVED_NOTICE type
      content: { text: 'Chat marked as resolved by agent.' },
    });
    this.server
      .to(`chatSession:${session._id.toString()}`)
      .emit('server:new_message', systemMessage);

    // Participants remain in the room for resolved chats, unlike ended chats, unless specified otherwise.
    // For now, assume they stay for a bit or until explicitly left.
    this.logger.log(`Agent ${client.user.sub} resolved chat ${session._id}.`);
    return {
      event: 'server:chat_resolved_ack',
      data: { chatSessionId: session._id.toString() },
    };
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
    if (!payload.fingerprint)
      throw new WsException('Fingerprint or customerId required.');

    const widget = await this.widgetsService.findByIdPublic(payload.widgetId);
    if (!widget || !widget.isEnabled) {
      throw new WsException('Widget not found or disabled.');
    }
    // Domain check (optional here, primary check on widget load via HTTP)
    // if (!widget.domains.includes(payload.domain) && !widget.domains.includes('*')) {
    //   throw new WsException('Domain not authorized for this widget.');
    // }

    const customer = await this.customersService.createOrUpdateCustomer({
      widgetId: new Types.ObjectId(payload.widgetId),
      fingerprint: payload.fingerprint,
      customerId: payload.customerId,
      metadata: {
        browserInfo: payload.browserInfo,
        currentPageUrl: payload.currentPageUrl,
        initialDomain: payload.domain,
      },
    });

    client.customerId = customer._id.toString();
    await this.redisService.mapSocketIdToCustomerId(
      client.id,
      customer._id.toString(),
    );
    client.join(`customer:${customer._id.toString()}`);
    this.logger.log(
      `Customer ${customer._id} (fingerprint: ${payload.fingerprint}) connected for widget ${payload.widgetId} with socket ${client.id}`,
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
      await this.visitorStateService.notifyAgentsAboutVisitor(
        customer,
        widget,
        payload.domain,
        VisitorEventType.CONNECT,
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

  // --- Common Events (Typing, Read Receipts) ---
  @SubscribeMessage('customer:typing_start')
  @SubscribeMessage('agent:typing_start')
  async handleTypingStart(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.logger.debug(
      `[handleTypingStart] <customer|agent>:typing_start emiited by clients with payload`,
    );
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');
    const eventName = client.user
      ? 'server:agent_typing_start'
      : 'server:customer_typing_start';
    this.logger.debug(`[handleTypingStart] final eventName: ${eventName}`);

    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(client.id)
      .emit(eventName, { chatSessionId: data.chatSessionId });
  }

  @SubscribeMessage('customer:typing_stop')
  @SubscribeMessage('agent:typing_stop')
  async handleTypingStop(
    @MessageBody() data: { chatSessionId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');
    const eventName = client.user
      ? 'server:agent_typing_stop'
      : 'server:customer_typing_stop';
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(client.id)
      .emit(eventName, { chatSessionId: data.chatSessionId });
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

    const upToTimestamp = data.lastMessageTimestamp
      ? new Date(data.lastMessageTimestamp)
      : new Date();
    if (isNaN(upToTimestamp.getTime()))
      throw new WsException('Invalid lastMessageTimestamp.');

    await this.chatMessageService.markMessagesAsReadByCustomer(
      data.chatSessionId,
      upToTimestamp,
    );
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(client.id)
      .emit('server:messages_read_by_customer', {
        chatSessionId: data.chatSessionId,
        upToTimestamp: upToTimestamp,
      });
  }

  @SubscribeMessage('agent:mark_messages_read')
  async handleAgentMarkMessagesRead(
    @MessageBody()
    data: { chatSessionId: string; lastMessageTimestamp?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.user) throw new WsException('Agent not authenticated.');
    if (!data.chatSessionId || !Types.ObjectId.isValid(data.chatSessionId))
      throw new WsException('Invalid chatSessionId');

    const upToTimestamp = data.lastMessageTimestamp
      ? new Date(data.lastMessageTimestamp)
      : new Date();
    if (isNaN(upToTimestamp.getTime()))
      throw new WsException('Invalid lastMessageTimestamp.');

    await this.chatMessageService.markMessagesAsReadByAgent(
      data.chatSessionId,
      upToTimestamp,
    );
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(client.id)
      .emit('server:messages_read_by_agent', {
        chatSessionId: data.chatSessionId,
        upToTimestamp: upToTimestamp,
      });
  }

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

    const now = new Date();

    // Mark the message as read by agent
    await this.chatMessageService.markMessagesAsReadByAgent(
      data.chatSessionId,
      now,
    );

    // Update agent's last seen timestamp
    await this.chatSessionService.updateAgentLastSeen(data.chatSessionId, now);

    // Notify the customer that the agent has seen the message
    this.server
      .to(`chatSession:${data.chatSessionId}`)
      .except(client.id)
      .emit('server:message_seen_by_agent', {
        chatSessionId: data.chatSessionId,
        messageId: data.messageId,
        timestamp: now,
      });
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
    this.logger.debug(
      `[handleAgentBookAppointment]: agent:book_appointment emitted by agent with payload ${JSON.stringify(payload)}`,
    );
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

    //this.logger.debug("[handleAgentBookAppointment] Fetching the session using chatSessionId")

    // if (!payload.customerId || !Types.ObjectId.isValid(payload.customerId))
    //   throw new WsException('Invalid customerId');

    // Get agent profile from client.user.sub
    const agent = await this.agentsService.findAgentProfileByUserId(
      client.user.sub,
    );
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

    // Notify customer
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

    this.logger.log(
      `Agent ${agent._id} booked appointment ${appointment._id} for customer ${chatSession.customerId.toString()} in session ${payload.chatSessionId}}.`,
    );
    return { event: 'server:appointment_booked_ack', data: appointment };
  }

  // --- Helper Methods ---
  private async removeParticipantsFromChatRoom(
    chatSessionId: string,
    agentSocketId: string,
    customerId: string,
  ) {
    // Fix for "Cannot read properties of undefined (reading 'get')" error
    let agentClient;
    if (this.server.sockets && this.server.sockets.sockets) {
      agentClient = this.server.sockets.sockets.get(agentSocketId);
    }
    if (agentClient) agentClient.leave(`chatSession:${chatSessionId}`);

    const customerSocketId =
      await this.redisService.getSocketIdByCustomerId(customerId);
    if (customerSocketId) {
      // Fix for "Cannot read properties of undefined (reading 'get')" error
      let customerClient;
      if (this.server.sockets && this.server.sockets.sockets) {
        customerClient = this.server.sockets.sockets.get(customerSocketId);
      }
      if (customerClient) customerClient.leave(`chatSession:${chatSessionId}`);
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
