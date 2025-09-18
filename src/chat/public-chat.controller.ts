import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { existsSync, mkdirSync, renameSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ChatMessageService } from './services/chat-message/chat-message.service';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { ChatMessageResponseDto } from './dto/chat-responses.dto';
import { Types } from 'mongoose';
import {
  ErrorResponseDto,
  NotFoundResponseDto,
} from '../shared/dto/common-responses.dto';
import { createChatImageUploadInterceptor } from '../shared/interceptors/file-upload.interceptor';
import { UploadImageDto } from './dto/upload-image.dto';
import {
  getChatImageUrl,
  getChatImageUploadPath,
  generateChatImageFilename,
} from '../shared/utils/file-upload.utils';

@ApiTags('Public Chat')
@Controller('public/chat')
export class PublicChatController {
  private readonly logger = new Logger(PublicChatController.name);

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

  @Post('upload-image')
  @UseInterceptors(createChatImageUploadInterceptor())
  @ApiOperation({
    summary: 'Upload an image for chat (Public)',
    description:
      'Upload an image file for use in chat messages. This endpoint is public and does not require authentication. The uploaded image will be stored and a URL will be returned for use in chat messages.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file and chat session ID',
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload (JPG, JPEG, PNG, GIF, WebP)',
        },
        chatSessionId: {
          type: 'string',
          description: 'ID of the chat session',
          example: '507f1f77bcf86cd799439011',
        },
      },
      required: ['image', 'chatSessionId'],
    },
  })
  @ApiResponse({
    status: 201,
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
          example: 'image-uuid.jpg',
        },
        originalName: {
          type: 'string',
          description: 'Original filename',
          example: 'my-image.jpg',
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
  @ApiBadRequestResponse({
    description: 'Invalid file type, size, or missing chat session ID',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Chat session not found',
    type: NotFoundResponseDto,
  })
  async uploadImage(
    @UploadedFile() file: any,
    @Body() uploadImageDto: UploadImageDto,
  ) {
    this.logger.log(
      `Public image upload request for session: ${uploadImageDto.chatSessionId}`,
    );

    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Verify that the chat session exists
    await this.chatSessionService.findByIdOrFail(uploadImageDto.chatSessionId);

    try {
      // Generate the correct filename and path for the actual chat session
      const correctFilename = generateChatImageFilename(
        uploadImageDto.chatSessionId,
        file.originalname,
      );
      const correctUploadPath = getChatImageUploadPath(
        uploadImageDto.chatSessionId,
      );

      // Create the correct directory if it doesn't exist
      if (!existsSync(correctUploadPath)) {
        mkdirSync(correctUploadPath, { recursive: true });
      }

      // Move the file from temp location to correct location
      const tempFilePath = file.path;
      const correctFilePath = join(correctUploadPath, correctFilename);

      renameSync(tempFilePath, correctFilePath);

      // Generate the public URL for the uploaded image
      const imageUrl = getChatImageUrl(
        uploadImageDto.chatSessionId,
        correctFilename,
      );

      this.logger.log(
        `Image uploaded successfully: ${correctFilename} for session ${uploadImageDto.chatSessionId}`,
      );

      return {
        imageUrl,
        filename: correctFilename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      // Clean up the temporary file if something goes wrong
      if (file.path && existsSync(file.path)) {
        try {
          unlinkSync(file.path);
        } catch (cleanupError) {
          this.logger.error('Failed to clean up temporary file:', cleanupError);
        }
      }

      this.logger.error('File upload processing failed:', error);
      throw new BadRequestException('Failed to process uploaded file');
    }
  }
}
