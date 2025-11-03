import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { ChatMessageService } from './services/chat-message/chat-message.service';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { AgentsService } from '../agents/agents.service';
import { CustomersService } from '../customers/customers.service';
import { WidgetsService } from '../widgets/widgets.service';
import { RedisService } from '../shared/redis/redis.service';
import { UsersService } from '../users/users.service';
import { ChatNotificationService } from './services/chat-notification/chat-notification.service';
import { ChatGateway } from './chat.gateway';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole, ChatSessionStatus } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { GetMessagesQueryDto } from './dto/get-messages.dto';
import { GetChatSessionsQueryDto } from './dto/get-chat-session.dto';
import { InitiateChatApiDto } from './dto/initiate-chat-api.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import {
  ChatSessionResponseDto,
  ChatMessageResponseDto,
  ActiveChatSessionResponseDto,
} from './dto/chat-responses.dto';
import { Types } from 'mongoose';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  PaginatedResponseDto,
} from '../shared/dto/common-responses.dto';
import { createChatImageUploadInterceptor } from '../shared/interceptors/file-upload.interceptor';
import { getChatImageUrl } from '../shared/utils/file-upload.utils';
import { AdminResolverUtil } from '../shared/utils/admin-resolver.util';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatMessageService: ChatMessageService,
    private readonly chatSessionService: ChatSessionService,
    private readonly agentsService: AgentsService,
    private readonly customersService: CustomersService,
    private readonly widgetsService: WidgetsService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ChatNotificationService))
    private readonly chatNotificationService: ChatNotificationService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('sessions')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get chat sessions',
    description:
      'Retrieve a paginated list of chat sessions with filtering options including appointment status and date range. Admins and managers can only see sessions assigned to their managed agents, agents can only see their own assigned sessions. Date filtering is based on the session initiation date (initiatedAt field).',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat sessions retrieved successfully',
    type: PaginatedResponseDto<ChatSessionResponseDto>,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin, Manager, or Agent role required',
    type: ForbiddenResponseDto,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter sessions initiated from this date (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter sessions initiated until this date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
  })
  async getAllChatSessions(
    @Query(new ValidationPipe({ transform: true }))
    queryDto: GetChatSessionsQueryDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    // For agents, automatically filter to only their own sessions
    if (user.role === UserRole.AGENT) {
      queryDto.agentId = user.sub;
    }

    // For admins and managers, filter to only sessions assigned to their managed agents
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      const adminId = await AdminResolverUtil.resolveAdminId(
        user,
        this.agentsService,
      );
      return this.chatSessionService.findAllPaginatedForAdmin(
        queryDto,
        adminId,
      );
    }

    return this.chatSessionService.findAllPaginated(queryDto);
  }

  @Get('sessions/my-active')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get current user active chat sessions',
    description:
      'Retrieve all active chat sessions assigned to the currently authenticated agent',
  })
  @ApiResponse({
    status: 200,
    description: 'Active chat sessions retrieved successfully',
    type: [ActiveChatSessionResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  async getMyActiveSessions(@AuthenticatedUser() user: JwtPayload) {
    this.logger.debug(`Getting my active sessions for ${user.email}`);
    const result = await this.chatSessionService.getActiveSessionsForAgent(
      user.sub,
    );
    this.logger.debug(`${result.length} active sessions found`);
    return result;
  }

  @Get('sessions/pending')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get pending chat sessions for current user',
    description:
      'Retrieve all pending chat sessions that the currently authenticated agent can access based on their department assignments. Only shows sessions with PENDING_ASSIGNMENT status from widgets the agent has access to. Agent must be online and within shift to access pending sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending chat sessions retrieved successfully',
    type: [ChatSessionResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Agent is not available (offline or outside shift hours)',
    type: ErrorResponseDto,
  })
  async getPendingSessions(@AuthenticatedUser() user: JwtPayload) {
    this.logger.debug(`Getting pending sessions for ${user.email}`);

    // Check if agent is currently available (online and within shift)
    const availability = await this.agentsService.isAgentCurrentlyAvailable(
      user.sub,
    );

    if (!availability.isAvailable) {
      let errorMessage = 'Agent is not available to view pending sessions';

      if (!availability.isOnline) {
        errorMessage = 'Agent must be online to view pending sessions';
      } else if (!availability.isWithinShift) {
        errorMessage =
          'Agent is outside shift hours and cannot view pending sessions';
        if (availability.nextAvailableTime) {
          errorMessage += `. Next available time: ${availability.nextAvailableTime.toISOString()}`;
        }
      }

      this.logger.warn(
        `Agent ${user.email} attempted to access pending sessions but is not available: ${errorMessage}`,
      );
      throw new BadRequestException(errorMessage);
    }

    const sessions = await this.chatSessionService.getPendingSessionsForAgent(
      user.sub,
    );
    this.logger.debug(
      `${sessions.length} pending sessions found for available agent ${user.email}`,
    );
    return sessions;
  }

  // Admin/Agent/Manager: View messages for a specific historic/active chat, paginated
  @Get('sessions/:sessionId/messages')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.MANAGER)
  async getMessagesForSession(
    @Param('sessionId') sessionId: string,
    @Query(new ValidationPipe({ transform: true }))
    queryDto: GetMessagesQueryDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID format');
    }
    const session = await this.chatSessionService.findByIdOrFail(sessionId);

    // Authorization: Agent can only access their own assigned chats
    if (user.role === UserRole.AGENT) {
      if (!session.agentId || session.agentId._id.toString() !== user.sub) {
        // Check if agent was EVER part of this chat, even if reassigned or closed?
        // For simplicity now, only current agent, admin, or manager.
        throw new ForbiddenException(
          'You do not have permission to view messages for this session.',
        );
      }
    }

    // Authorization: Admin and Manager can only access sessions assigned to their managed agents
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      if (!session.agentId) {
        throw new ForbiddenException(
          'You do not have permission to view messages for this unassigned session.',
        );
      }

      // Resolve adminId for managers
      const adminId = await AdminResolverUtil.resolveAdminId(
        user,
        this.agentsService,
      );

      // Check if the session's agent is managed by this admin
      const isAuthorized =
        await this.chatSessionService.isSessionAccessibleByAdmin(
          sessionId,
          adminId,
        );

      if (!isAuthorized) {
        throw new ForbiddenException(
          'You do not have permission to view messages for this session.',
        );
      }
    }

    const limit = queryDto.limit ? Number(queryDto.limit) : 50;
    const page = queryDto.page ? Number(queryDto.page) : 1;

    return this.chatMessageService.getMessagesForSession(
      sessionId,
      limit,
      page,
    );
  }

  @Post('initiate')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Initiate chat with customer',
    description:
      'Create a new chat session with a customer. The agent will be automatically assigned to the session and joined to the WebSocket room. Customer will be notified about the agent-initiated chat.',
  })
  @ApiBody({
    type: InitiateChatApiDto,
    description: 'Customer ID to initiate chat with',
  })
  @ApiCreatedResponse({
    description: 'Chat session created successfully',
    type: ChatSessionResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid customer ID, agent at max concurrent chats, customer already has active session, or agent lacks access',
    type: ErrorResponseDto,
  })
  async initiateChat(
    @Body(new ValidationPipe({ transform: true })) body: InitiateChatApiDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    this.logger.log(
      `Agent ${user.email} (${user.sub}) initiating chat with customer ${body.customerId}`,
    );

    // Validate customer ID format
    if (!Types.ObjectId.isValid(body.customerId)) {
      throw new BadRequestException('Invalid customer ID format');
    }

    const agentUserId = user.sub;

    // Get agent profile and check concurrent chat limits
    const agentProfile =
      await this.agentsService.findAgentProfileByUserIdOrFail(agentUserId);

    const activeChats = await this.chatSessionService.countActiveChatsForAgent(
      new Types.ObjectId(agentUserId),
    );

    if (activeChats >= agentProfile.maxConcurrentChats) {
      this.logger.warn(
        `Agent ${agentUserId} attempted to initiate chat but reached max concurrent chats (${agentProfile.maxConcurrentChats}).`,
      );
      throw new BadRequestException(
        `Maximum concurrent chats limit reached (${agentProfile.maxConcurrentChats}).`,
      );
    }

    // Widget access validation
    const accessCheck = await this.agentsService.canAgentAccessCustomer(
      agentUserId,
      body.customerId,
    );

    if (!accessCheck.canAccess) {
      this.logger.warn(
        `Agent ${agentUserId} access denied for customer ${body.customerId}: ${accessCheck.reason}`,
      );
      throw new ForbiddenException(`Access denied: ${accessCheck.reason}`);
    }

    const { customer, widget } = accessCheck;

    // Check for existing active sessions
    const existingSession =
      await this.chatSessionService.findActiveSessionForCustomer(
        body.customerId,
      );

    if (existingSession) {
      this.logger.warn(
        `Agent ${agentUserId} attempted to initiate chat with customer ${body.customerId} who already has active session ${existingSession._id}`,
      );
      throw new BadRequestException(
        'Customer already has an active chat session.',
      );
    }

    // Create new chat session with agent pre-assigned
    const chatSession = await this.chatSessionService.initiateAgentChat(
      body.customerId,
      agentUserId,
      widget,
      customer,
    );

    this.logger.log(
      `Agent ${agentUserId} successfully created chat session ${chatSession._id} with customer ${body.customerId}`,
    );

    // Handle WebSocket room joining for all agent sockets
    try {
      const allAgentSockets =
        await this.redisService.getAllSocketsForAgent(agentUserId);

      if (allAgentSockets.length > 0) {
        this.logger.log(
          `Joining ${allAgentSockets.length} agent sockets to session room for session ${chatSession._id}`,
        );

        // Join all agent sockets to the chat session room
        for (const socketId of allAgentSockets) {
          try {
            const sockets = await this.chatGateway.server
              .in(socketId)
              .fetchSockets();
            if (sockets.length > 0) {
              const agentSocket = sockets[0]; // Should only be one socket with this ID
              await agentSocket.join(
                `chatSession:${chatSession._id.toString()}`,
              );
              this.logger.debug(
                `Socket ${socketId} joined room chatSession:${chatSession._id.toString()}`,
              );
            } else {
              this.logger.warn(
                `Socket ${socketId} not found in server for agent ${agentUserId}`,
              );
            }
          } catch (error) {
            this.logger.error(
              `Error joining socket ${socketId} to session room: ${error.message}`,
            );
          }
        }
      } else {
        this.logger.warn(
          `Agent ${agentUserId} has no active WebSocket connections. Session created but agent won't receive real-time updates until they connect.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error joining agent sockets to session room: ${error.message}`,
        error.stack,
      );
      // Don't fail the API call, just log the error
    }

    // Join customer to chat session room if they are online
    try {
      const customerSockets = await this.redisService.getAllSocketsForCustomer(
        body.customerId,
      );
      if (customerSockets.length > 0) {
        this.logger.log(
          `Joining customer ${body.customerId} to chat session ${chatSession._id} room. Customer has ${customerSockets.length} active socket(s).`,
        );

        // Join all customer sockets to the chat session room
        for (const socketId of customerSockets) {
          // const socket = this.chatGateway.server.sockets.sockets.get(socketId);
          // if (socket) {
          //   socket.join(`chatSession:${chatSession._id.toString()}`);
          //   this.logger.debug(
          //     `Customer socket ${socketId} joined chat session room`,
          //   );
          // }

          const sockets = await this.chatGateway.server
            .in(socketId)
            .fetchSockets();
          if (sockets.length > 0) {
            const customerSocket = sockets[0];
            customerSocket.join(`chatSession:${chatSession._id.toString()}`);
            this.logger.debug(
              `Customer socket ${socketId} joined room chatSession:${chatSession._id.toString()}`,
            );
          }
        }
      } else {
        this.logger.log(
          `Customer ${body.customerId} is not currently online. They will join the chat session room when they connect.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error joining customer sockets to session room: ${error.message}`,
        error.stack,
      );
      // Don't fail the API call, just log the error
    }

    // Notify customer about agent-initiated chat
    try {
      const agentUser = await this.usersService.findById(agentUserId);
      const agentName = agentUser ? agentUser.firstName : 'Agent';

      this.chatGateway.server
        .to(`customer:${body.customerId}`)
        .emit('server:agent_initiated_chat', {
          chatSessionId: chatSession._id.toString(),
          agentName,
          agentId: agentUserId,
          widget: {
            id: widget._id.toString(),
            name: widget.name,
            welcomeMessage: widget.welcomeMessage,
          },
          session: chatSession,
        });

      this.logger.log(
        `Customer ${body.customerId} notified about agent-initiated chat from ${agentName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error notifying customer about agent-initiated chat: ${error.message}`,
        error.stack,
      );
      // Don't fail the API call, just log the error
    }

    // Return the created session
    return {
      chatSessionId: chatSession._id.toString(),
      status: chatSession.status,
      customer: {
        id: customer._id.toString(),
        name: customer.name,
        email: customer.email,
      },
      widget: {
        id: widget._id.toString(),
        name: widget.name,
        welcomeMessage: widget.welcomeMessage,
      },
      createdAt: chatSession.initiatedAt,
      message:
        'Chat session created successfully. You can now send messages using WebSocket events.',
    };
  }

  // ==================== IMAGE UPLOAD ENDPOINTS ====================

  @Post('upload-image')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.MANAGER)
  @UseInterceptors(createChatImageUploadInterceptor())
  @ApiOperation({
    summary: 'Upload image for chat',
    description:
      'Upload an image file to be used in chat messages. The image will be stored and a URL will be returned that can be used in chat messages. Maximum file size is 10MB. Supported formats: JPG, JPEG, PNG, GIF, WebP.',
  })
  @ApiCreatedResponse({
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        imageUrl: {
          type: 'string',
          description: 'URL of the uploaded image',
          example:
            '/uploads/chat-images/507f1f77bcf86cd799439011/image-uuid.jpg',
        },
        filename: {
          type: 'string',
          description: 'Generated filename',
          example: '507f1f77bcf86cd799439011-uuid.jpg',
        },
        originalName: {
          type: 'string',
          description: 'Original filename',
          example: 'screenshot.jpg',
        },
        size: {
          type: 'number',
          description: 'File size in bytes',
          example: 1024000,
        },
        mimetype: {
          type: 'string',
          description: 'MIME type of the uploaded file',
          example: 'image/jpeg',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid file, file too large, or invalid chat session ID',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Access denied to the chat session',
    type: ForbiddenResponseDto,
  })
  async uploadChatImage(
    @Body() uploadDto: UploadImageDto,
    @UploadedFile() file: any,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Validate chat session ID
    if (!Types.ObjectId.isValid(uploadDto.chatSessionId)) {
      throw new BadRequestException('Invalid chat session ID format');
    }

    // Check if user has access to this chat session
    const session = await this.chatSessionService.findByIdOrFail(
      uploadDto.chatSessionId,
    );

    // Authorization check based on user role
    if (user.role === UserRole.AGENT) {
      // Agent can only upload to their assigned sessions
      if (!session.agentId || session.agentId.toString() !== user.sub) {
        throw new ForbiddenException(
          'You do not have permission to upload images to this chat session.',
        );
      }
    } else if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
      // Admin/Manager can upload to sessions assigned to their managed agents
      if (session.agentId) {
        // Resolve adminId for managers
        const adminId = await AdminResolverUtil.resolveAdminId(
          user,
          this.agentsService,
        );

        const isAuthorized =
          await this.chatSessionService.isSessionAccessibleByAdmin(
            uploadDto.chatSessionId,
            adminId,
          );
        if (!isAuthorized) {
          throw new ForbiddenException(
            'You do not have permission to upload images to this chat session.',
          );
        }
      }
    }
    // Note: CUSTOMER role would need additional validation if customers can upload
    // For now, we'll allow it if they have the role, but in practice you might want
    // to check if the customer owns the session

    // Generate the image URL
    const imageUrl = getChatImageUrl(uploadDto.chatSessionId, file.filename);

    this.logger.log(
      `User ${user.email} uploaded image ${file.filename} for chat session ${uploadDto.chatSessionId}`,
    );

    return {
      imageUrl,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
