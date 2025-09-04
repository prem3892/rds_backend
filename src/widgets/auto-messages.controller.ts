import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AutoMessagesService } from './auto-messages.service';
import { CreateAutoMessageDto } from './dto/create-auto-message.dto';
import { UpdateAutoMessageDto } from './dto/update-auto-message.dto';
import { GetAutoMessagesDto } from './dto/get-auto-messages.dto';
import {
  AutoMessageResponseDto,
  PaginatedAutoMessagesResponseDto,
} from './dto/auto-message-responses.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { Types } from 'mongoose';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  SuccessMessageResponseDto,
} from '../shared/dto/common-responses.dto';

@ApiTags('Auto Messages')
@Controller('auto-messages')
export class AutoMessagesController {
  constructor(private readonly autoMessagesService: AutoMessagesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Create a new auto message (Admin only)',
    description:
      'Create an auto message that will be displayed on specific pages of a widget',
  })
  @ApiResponse({
    status: 201,
    description: 'Auto message created successfully',
    type: AutoMessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  create(
    @Body() createAutoMessageDto: CreateAutoMessageDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    return this.autoMessagesService.create(
      createAutoMessageDto,
      new Types.ObjectId(user.sub),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get auto messages with filtering (Admin only)',
    description:
      'Retrieve auto messages with optional filtering by widget, domain, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto messages retrieved successfully',
    type: PaginatedAutoMessagesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  findAll(
    @Query() query: GetAutoMessagesDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    return this.autoMessagesService.findAll(
      query,
      new Types.ObjectId(user.sub),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get auto message by ID (Admin only)',
    description: 'Retrieve a specific auto message by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Auto message unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto message retrieved successfully',
    type: AutoMessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid auto message ID format',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Auto message not found',
    type: NotFoundResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  findOne(@Param('id') id: string, @AuthenticatedUser() user: JwtPayload) {
    return this.autoMessagesService.findById(id, new Types.ObjectId(user.sub));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update auto message (Admin only)',
    description: 'Update an existing auto message',
  })
  @ApiParam({
    name: 'id',
    description: 'Auto message unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    type: UpdateAutoMessageDto,
    description: 'Auto message update data',
    examples: {
      'Update title and message': {
        summary: 'Update title and message',
        description: 'Example of updating the title and message content',
        value: {
          title: 'Updated Welcome Message',
          message:
            'Hello! We have updated our support system. How can we help you today?',
        },
      },
      'Update all fields': {
        summary: 'Update all fields',
        description: 'Example of updating all available fields',
        value: {
          title: 'Complete Auto Message Update',
          message:
            'This is a completely updated auto message with new content.',
          widgetId: '507f1f77bcf86cd799439011',
          domain: 'updated-example.com',
          sitewide: true,
          pagePaths: ['updated-path/page1', 'updated-path/page2'],
          showAfterSeconds: 10,
          isEnabled: true,
        },
      },
      'Enable/disable message': {
        summary: 'Toggle message status',
        description: 'Example of just enabling or disabling the message',
        value: {
          isEnabled: false,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Auto message updated successfully',
    type: AutoMessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or auto message ID format',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Auto message not found',
    type: NotFoundResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() updateAutoMessageDto: UpdateAutoMessageDto,
    @AuthenticatedUser() user: JwtPayload,
  ) {
    return this.autoMessagesService.update(
      id,
      updateAutoMessageDto,
      new Types.ObjectId(user.sub),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Delete auto message (Admin only)',
    description: 'Delete an existing auto message',
  })
  @ApiParam({
    name: 'id',
    description: 'Auto message unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Auto message deleted successfully',
    type: SuccessMessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid auto message ID format',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Auto message not found',
    type: NotFoundResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  remove(@Param('id') id: string, @AuthenticatedUser() user: JwtPayload) {
    return this.autoMessagesService.remove(id, new Types.ObjectId(user.sub));
  }
}
