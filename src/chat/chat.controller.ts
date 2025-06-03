import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ChatMessageService } from './services/chat-message/chat-message.service';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { GetMessagesQueryDto } from './dto/get-messages.dto';
import { GetChatSessionsQueryDto } from './dto/get-chat-session.dto';
import { Types } from 'mongoose';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatMessageService: ChatMessageService,
    private readonly chatSessionService: ChatSessionService,
  ) {}

  // Admin: View all chat sessions, filterable, paginated
  @Get('sessions')
  @Roles(UserRole.ADMIN)
  async getAllChatSessions(
    @Query(new ValidationPipe({ transform: true }))
    queryDto: GetChatSessionsQueryDto,
  ) {
    return this.chatSessionService.findAllPaginated(queryDto);
  }

  // Agent: List agent's active chats (Not paginated, could be if list grows large)
  @Get('sessions/my-active')
  @Roles(UserRole.AGENT)
  async getMyActiveSessions(@AuthenticatedUser() user: JwtPayload) {
    return this.chatSessionService.getActiveSessionsForAgent(user.sub);
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

    // Authorization: Agent can only access their own assigned chats unless admin
    if (user.role === UserRole.AGENT) {
      if (!session.agentId || session.agentId._id.toString() !== user.sub) {
        // Check if agent was EVER part of this chat, even if reassigned or closed?
        // For simplicity now, only current agent or admin.
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
