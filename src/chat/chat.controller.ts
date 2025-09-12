import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ChatMessageService } from './services/chat-message/chat-message.service';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { AgentsService } from '../agents/agents.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { GetMessagesQueryDto } from './dto/get-messages.dto';
import { GetChatSessionsQueryDto } from './dto/get-chat-session.dto';
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
  ) {}

  @Get('sessions')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Get chat sessions',
    description:
      'Retrieve a paginated list of chat sessions with filtering options. Admins can only see sessions assigned to their managed agents, agents can only see their own assigned sessions.',
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
    description: 'Admin or Agent role required',
    type: ForbiddenResponseDto,
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

    // For admins, filter to only sessions assigned to their managed agents
    if (user.role === UserRole.ADMIN) {
      return this.chatSessionService.findAllPaginatedForAdmin(
        queryDto,
        user.sub,
      );
    }

    return this.chatSessionService.findAllPaginated(queryDto);
  }

  @Get('sessions/my-active')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
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
    description: 'Agent or Admin role required',
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
  @Roles(UserRole.AGENT, UserRole.ADMIN)
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
    description: 'Agent or Admin role required',
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

  // Admin/Agent: View messages for a specific historic/active chat, paginated
  @Get('sessions/:sessionId/messages')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
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
        // For simplicity now, only current agent or admin.
        throw new ForbiddenException(
          'You do not have permission to view messages for this session.',
        );
      }
    }

    // Authorization: Admin can only access sessions assigned to their managed agents
    if (user.role === UserRole.ADMIN) {
      if (!session.agentId) {
        throw new ForbiddenException(
          'You do not have permission to view messages for this unassigned session.',
        );
      }

      // Check if the session's agent is managed by this admin
      const isAuthorized =
        await this.chatSessionService.isSessionAccessibleByAdmin(
          sessionId,
          user.sub,
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
}
