import { Controller, Get, Param, BadRequestException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ChatMessageService } from './services/chat-message/chat-message.service';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { ChatMessageResponseDto } from './dto/chat-responses.dto';
import { Types } from 'mongoose';
import {
  ErrorResponseDto,
  NotFoundResponseDto,
} from '../shared/dto/common-responses.dto';

@ApiTags('Public Chat')
@Controller('public/chat')
export class PublicChatController {
  constructor(
    private readonly chatMessageService: ChatMessageService,
    private readonly chatSessionService: ChatSessionService,
  ) {}

  @Get('sessions/:sessionId/messages')
  @ApiOperation({
    summary: 'Get all messages for a chat session (Public)',
    description:
      'Retrieve all messages for a specific chat session without authentication. This endpoint returns all messages without pagination and is intended for public access where no login is required.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'The ID of the chat session',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'All messages retrieved successfully',
    type: [ChatMessageResponseDto],
  })
  @ApiBadRequestResponse({
    description: 'Invalid session ID format',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Chat session not found',
    type: NotFoundResponseDto,
  })
  async getMessagesForSession(@Param('sessionId') sessionId: string) {
    // Validate session ID format
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new BadRequestException('Invalid session ID format');
    }

    // Verify that the session exists (but don't enforce authorization)
    await this.chatSessionService.findByIdOrFail(sessionId);

    // Return all messages without pagination (set a very high limit)
    return this.chatMessageService.getMessagesForSession(
      sessionId,
      10000, // High limit to get all messages
      1, // First page
    );
  }
}
