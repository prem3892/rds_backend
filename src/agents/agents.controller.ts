import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
  NotFoundException,
  BadRequestException,
  Logger,
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
  ApiConsumes,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { CreateCannedMessageDto } from './dto/create-canned-message.dto';
import { UpdateCannedMessageDto } from './dto/update-canned-message.dto';
import { GetCannedMessagesDto } from './dto/get-canned-messages.dto';
import {
  AgentProfileResponseDto,
  CannedMessageResponseDto,
  AgentStatusResponseDto,
} from './dto/agent-responses.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service'; // For password updates
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { Types } from 'mongoose';
import { createProfilePictureUploadInterceptor } from '../shared/interceptors/file-upload.interceptor';
import { getProfilePictureUrl } from '../shared/utils/file-upload.utils';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  SuccessMessageResponseDto,
  PaginatedResponseDto,
} from '../shared/dto/common-responses.dto';

@ApiTags('Agents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get all agents with profiles (Admin only)',
    description:
      'Retrieve a list of all agent profiles with associated user details. Only accessible by administrators.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of agents retrieved successfully',
    type: [AgentProfileResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  async getAllAgentsWithProfiles(@AuthenticatedUser() adminUser: JwtPayload) {
    return this.agentsService.getAllAgentProfilesWithUserDetails(adminUser.sub);
  }

  @Get('me/profile')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get current user agent profile',
    description:
      'Retrieve the agent profile for the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent profile retrieved successfully',
    type: AgentProfileResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Agent profile not found',
    type: NotFoundResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent or Admin role required',
    type: ForbiddenResponseDto,
  })
  async getMyProfile(@AuthenticatedUser() user: JwtPayload) {
    const agentProfile = await this.agentsService.findAgentProfileByUserId(
      user.sub,
    );
    if (!agentProfile) {
      throw new NotFoundException('Agent profile not found.');
    }
    const userDetails = await this.usersService.findById(user.sub);
    return {
      ...agentProfile.toObject(),
      user: userDetails
        ? {
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
          }
        : null,
    };
  }

  // Agent/Admin: Update their own profile (limited fields + password via usersService)
  @Put('me/profile')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update own agent profile',
    description:
      'Update the agent profile for the currently authenticated user. Agents can only update their online status and profile picture. Admins have full access to update all fields including personal information, departments, and settings.',
  })
  @ApiBody({
    type: UpdateAgentProfileDto,
    description: 'Agent profile update data',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent profile updated successfully',
    type: AgentProfileResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or agent profile not found',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Agent profile not found',
    type: ErrorResponseDto,
  })
  async updateMyProfile(
    @AuthenticatedUser() user: JwtPayload,
    @Body()
    updateDto: UpdateAgentProfileDto & {
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ) {
    // First check if the agent profile exists
    const existingAgentProfile =
      await this.agentsService.findAgentProfileByUserId(user.sub);
    if (!existingAgentProfile) {
      throw new NotFoundException('Agent profile not found.');
    }

    // Role-based field restrictions
    if (user.role === UserRole.AGENT) {
      // Agents can only update profile picture and basic profile fields
      // Restricted fields that require admin permission
      const restrictedFields = [
        'departmentIds',
        'domainAccess',
        'maxConcurrentChats',
        'shifts',
        'timezone',
        'email',
        'firstName',
        'lastName',
      ];
      const hasRestrictedFields = restrictedFields.some(
        (field) => updateDto[field] !== undefined,
      );

      if (hasRestrictedFields) {
        throw new BadRequestException(
          'Please contact your admin to update department access, domain permissions, concurrent chat limits, shifts, or timezone settings.',
        );
      }

      // Check for user fields that agents cannot update
      if (updateDto.firstName || updateDto.lastName || updateDto.email) {
        throw new BadRequestException(
          'Please contact your admin to update personal information.',
        );
      }
    }

    // Handle USER schema fields (firstName, lastName, email) - only for admins
    if (user.role === UserRole.ADMIN) {
      const userUpdatePayload: UpdateUserDto = {};
      if (updateDto.firstName)
        userUpdatePayload.firstName = updateDto.firstName;
      if (updateDto.lastName) userUpdatePayload.lastName = updateDto.lastName;
      if (updateDto.email) userUpdatePayload.email = updateDto.email;

      // Update user fields if any are provided
      if (Object.keys(userUpdatePayload).length > 0) {
        await this.usersService.update(user.sub, userUpdatePayload);
      }
    }

    // Handle AGENT PROFILE schema fields
    const agentProfileUpdatePayload: UpdateAgentProfileDto = { ...updateDto };
    // Remove user-specific fields from agent profile payload
    delete agentProfileUpdatePayload['firstName'];
    delete agentProfileUpdatePayload['lastName'];
    delete agentProfileUpdatePayload['email'];

    // For agents, only allow specific fields
    if (user.role === UserRole.AGENT) {
      const allowedAgentFields: Partial<UpdateAgentProfileDto> = {};
      if (typeof updateDto.isOnline === 'boolean')
        allowedAgentFields.isOnline = updateDto.isOnline;
      if (updateDto.profilePicture)
        allowedAgentFields.profilePicture = updateDto.profilePicture;

      // Update with only allowed fields
      const updatedProfile = await this.agentsService.updateAgentProfileById(
        user.sub,
        allowedAgentFields,
      );

      const userDetails = await this.usersService.findById(user.sub);
      return {
        ...updatedProfile.toObject(),
        user: userDetails
          ? {
              email: userDetails.email,
              firstName: userDetails.firstName,
              lastName: userDetails.lastName,
            }
          : null,
      };
    }

    // For admins, allow all fields
    const updatedProfile = await this.agentsService.updateAgentProfileById(
      user.sub,
      agentProfileUpdatePayload,
    );

    const userDetails = await this.usersService.findById(user.sub);
    return {
      ...updatedProfile.toObject(),
      user: userDetails
        ? {
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
          }
        : null,
    };
  }

  // Admin: Update any agent's profile
  @Put(':agentId/profile')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update agent profile by admin',
    description:
      'Update any agent profile by admin. Supports updating all agent profile fields including shifts, timezone, departments, domain access, and user details (firstName, lastName, email, password). Admin can only update profiles they created.',
  })
  @ApiBody({
    type: UpdateAgentProfileDto,
    description:
      'Agent profile update data with optional user fields (firstName, lastName, email, password)',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent profile updated successfully',
    type: AgentProfileResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid agent ID format, agent not found, or unauthorized access',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Agent profile not found',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
  async updateAgentProfileByAdmin(
    @Param('agentId') agentId: string,
    @AuthenticatedUser() adminUser: JwtPayload,
    @Body()
    updateDto: UpdateAgentProfileDto & {
      password?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    },
  ) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new BadRequestException('Invalid agent ID format');
    }

    // First check if the agent profile exists using agentId (not userId)
    const existingAgentProfile =
      await this.agentsService.findAgentProfileById(agentId);
    if (!existingAgentProfile) {
      throw new NotFoundException(`Agent profile with ID ${agentId} not found`);
    }

    // Check if the current admin is the one who created this agent profile
    if (
      existingAgentProfile.adminId &&
      existingAgentProfile.adminId.toString() !== adminUser.sub
    ) {
      Logger.warn(
        `Admin ${adminUser.sub} attempted to update agent ${agentId} created by admin ${existingAgentProfile.adminId}`,
      );
      throw new BadRequestException(
        'You can only update agent profiles that you created',
      );
    }

    // Get the userId from the agent profile
    const userId = existingAgentProfile.userId;
    if (!userId) {
      throw new BadRequestException(
        'This agent profile is not associated with a user',
      );
    }

    // Verify the user exists and is an agent or admin
    const userToUpdate = await this.usersService.findByIdOrFail(userId);
    if (
      userToUpdate.role !== UserRole.AGENT &&
      userToUpdate.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException('This user is not an agent or admin.');
    }

    // Handle USER schema fields (firstName, lastName, email, password)
    const userUpdatePayload: UpdateUserDto = {};
    if (updateDto.password) userUpdatePayload.password = updateDto.password;
    if (updateDto.firstName) userUpdatePayload.firstName = updateDto.firstName;
    if (updateDto.lastName) userUpdatePayload.lastName = updateDto.lastName;
    if (updateDto.email) userUpdatePayload.email = updateDto.email;

    // Update user fields if any are provided
    if (Object.keys(userUpdatePayload).length > 0) {
      await this.usersService.update(userId.toString(), userUpdatePayload);
    }

    // Handle AGENT PROFILE schema fields (departmentIds, domainAccess, isOnline, maxConcurrentChats)
    const agentProfileUpdatePayload: UpdateAgentProfileDto = { ...updateDto };
    // Remove user-specific fields from agent profile payload
    delete agentProfileUpdatePayload['password'];
    delete agentProfileUpdatePayload['firstName'];
    delete agentProfileUpdatePayload['lastName'];
    delete agentProfileUpdatePayload['email'];

    // Update agent profile fields with agentId directly
    const updatedProfile = await this.agentsService.updateAgentProfileById(
      agentId,
      agentProfileUpdatePayload,
    );

    // Get updated user details to return combined response
    const userDetails = await this.usersService.findById(userId);
    return {
      ...updatedProfile.toObject(),
      user: userDetails
        ? {
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
          }
        : null,
    };
  }

  // For REST-based status updates (though primary is WebSocket)
  @Patch('status') // Or use /me/status for agent's own
  @Roles(UserRole.AGENT, UserRole.ADMIN) // Both agents and admins can set status
  async setOnlineStatus(
    @AuthenticatedUser() user: JwtPayload,
    @Body() body: { isOnline: boolean },
  ) {
    // This endpoint is mostly for fallback or specific scenarios.
    // The `agent:set_online_status` WebSocket event is primary.
    if (typeof body.isOnline !== 'boolean') {
      throw new BadRequestException('isOnline must be a boolean.');
    }
    // This will also be handled by the ChatGateway, but providing a REST endpoint.
    return this.agentsService.setOnlineStatus(user.sub, body.isOnline);
  }

  // ==================== PROFILE PICTURE ENDPOINTS ====================

  @Post('profile-picture/upload')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @UseInterceptors(createProfilePictureUploadInterceptor())
  @ApiOperation({
    summary: 'Upload profile picture',
    description:
      'Upload a profile picture for the authenticated agent. Supports JPG, JPEG, PNG, and GIF formats. Maximum file size: 5MB. The uploaded file will be automatically renamed and stored securely.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile picture file upload',
    schema: {
      type: 'object',
      properties: {
        profilePicture: {
          type: 'string',
          format: 'binary',
          description: 'Profile picture file (JPG, JPEG, PNG, GIF)',
        },
      },
      required: ['profilePicture'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Profile picture uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        profilePictureUrl: {
          type: 'string',
          example: '/uploads/profile-pictures/agent-123-uuid.jpg',
          description: 'URL path to the uploaded profile picture',
        },
        message: {
          type: 'string',
          example: 'Profile picture uploaded successfully',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid file type, file too large, or no file provided',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent or Admin role required',
    type: ForbiddenResponseDto,
  })
  async uploadProfilePicture(
    @AuthenticatedUser() user: JwtPayload,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const profilePictureUrl = getProfilePictureUrl(file.filename);

    // TODO: Add image resizing/optimization functionality here
    // - Resize to standard dimensions (e.g., 200x200, 400x400)
    // - Optimize file size while maintaining quality
    // - Generate thumbnails for different use cases

    return {
      profilePictureUrl,
      message: 'Profile picture uploaded successfully',
    };
  }

  // ==================== CANNED MESSAGES ENDPOINTS ====================

  @Post('canned-messages')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new canned message',
    description:
      'Create a new canned message that can be used for quick responses in chat conversations. Returns the created message with populated agent information.',
  })
  @ApiResponse({
    status: 201,
    description: 'Canned message created successfully',
    type: CannedMessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or duplicate title',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent or Admin role required',
    type: ForbiddenResponseDto,
  })
  async createCannedMessage(
    @AuthenticatedUser() user: JwtPayload,
    @Body() createDto: CreateCannedMessageDto,
  ) {
    return this.agentsService.createCannedMessage(user.sub, createDto);
  }

  /**
   * Get canned messages with pagination and filtering
   */
  @Get('canned-messages')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get canned messages with pagination and filtering',
    description:
      'Retrieve canned messages with support for pagination, search by title, filtering by tags, departments, and sorting options. Returns populated agent information (firstName, lastName, email) for each message.',
  })
  @ApiResponse({
    status: 200,
    description: 'Canned messages retrieved successfully',
    type: PaginatedResponseDto<CannedMessageResponseDto>,
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
    description: 'Agent or Admin role required',
    type: ForbiddenResponseDto,
  })
  async getCannedMessages(
    @AuthenticatedUser() user: JwtPayload,
    @Query() queryDto: GetCannedMessagesDto,
  ) {
    return this.agentsService.getCannedMessages(user.sub, queryDto);
  }

  /**
   * Get a specific canned message by ID
   */
  @Get('canned-messages/:id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async getCannedMessageById(
    @AuthenticatedUser() user: JwtPayload,
    @Param('id') messageId: string,
  ) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID format');
    }
    return this.agentsService.getCannedMessageById(user.sub, messageId);
  }

  /**
   * Update a canned message
   */
  @Put('canned-messages/:id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a canned message',
    description:
      'Update an existing canned message. Only the creator can update their own messages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Canned message updated successfully',
    type: CannedMessageResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid input data, duplicate title, or invalid message ID format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent or Admin role required, or not the message creator',
    type: ForbiddenResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Canned message not found',
    type: NotFoundResponseDto,
  })
  async updateCannedMessage(
    @AuthenticatedUser() user: JwtPayload,
    @Param('id') messageId: string,
    @Body() updateDto: UpdateCannedMessageDto,
  ) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID format');
    }
    return this.agentsService.updateCannedMessage(
      user.sub,
      messageId,
      updateDto,
    );
  }

  /**
   * Delete a canned message
   */
  @Delete('canned-messages/:id')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  async deleteCannedMessage(
    @AuthenticatedUser() user: JwtPayload,
    @Param('id') messageId: string,
  ) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID format');
    }
    await this.agentsService.deleteCannedMessage(user.sub, messageId);
    return { message: 'Canned message deleted successfully' };
  }

  /**
   * Check agent availability based on shift schedule
   */
  @Get('me/availability')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Check agent availability',
    description:
      'Check if the agent is currently available based on their shift schedule and online status',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent availability status',
    schema: {
      type: 'object',
      properties: {
        isAvailable: {
          type: 'boolean',
          description: 'Whether agent is available for new chats',
        },
        isWithinShift: {
          type: 'boolean',
          description: 'Whether current time is within agent working hours',
        },
        isOnline: {
          type: 'boolean',
          description: 'Whether agent is marked as online',
        },
        nextAvailableTime: {
          type: 'string',
          format: 'date-time',
          description: 'Next available time if currently unavailable',
        },
      },
      examples: {
        available: {
          summary: 'Agent Available',
          value: {
            isAvailable: true,
            isWithinShift: true,
            isOnline: true,
            nextAvailableTime: null,
          },
        },
        offline: {
          summary: 'Agent Offline',
          value: {
            isAvailable: false,
            isWithinShift: true,
            isOnline: false,
            nextAvailableTime: null,
          },
        },
        outsideShift: {
          summary: 'Outside Working Hours',
          value: {
            isAvailable: false,
            isWithinShift: false,
            isOnline: true,
            nextAvailableTime: '2024-01-15T09:00:00.000Z',
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent or Admin role required',
    type: ForbiddenResponseDto,
  })
  async getMyAvailability(@AuthenticatedUser() user: JwtPayload) {
    return this.agentsService.isAgentCurrentlyAvailable(user.sub);
  }
}
