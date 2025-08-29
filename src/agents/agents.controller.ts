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
  async updateMyProfile(
    @AuthenticatedUser() user: JwtPayload,
    @Body() updateDto: UpdateAgentProfileDto & { password?: string }, // Allow password here
  ) {
    // Password update
    if (updateDto.password) {
      await this.usersService.update(user.sub, {
        password: updateDto.password,
      });
    }

    // Profile fields (Agent can update a limited set for themselves)
    const allowedProfileUpdates: Partial<UpdateAgentProfileDto> = {};
    if (updateDto.maxConcurrentChats)
      allowedProfileUpdates.maxConcurrentChats = updateDto.maxConcurrentChats;
    // Agents typically shouldn't change their own departments or domainAccess; admins do that.
    // If they can, add them here:
    // if (updateDto.departmentIds) allowedProfileUpdates.departmentIds = updateDto.departmentIds;
    // if (updateDto.domainAccess) allowedProfileUpdates.domainAccess = updateDto.domainAccess;

    const updatedProfile = await this.agentsService.updateAgentProfileById(
      user.sub,
      allowedProfileUpdates,
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

  // ==================== CANNED MESSAGES ENDPOINTS ====================

  @Post('canned-messages')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new canned message',
    description:
      'Create a new canned message that can be used for quick responses in chat conversations',
  })
  @ApiResponse({
    status: 201,
    description: 'Canned message created successfully',
    type: CannedMessageResponseDto,
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
      'Retrieve canned messages with support for pagination, search, filtering by tags, departments, and sorting options',
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
}
