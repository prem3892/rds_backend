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
  Inject,
  forwardRef,
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
import { BulkUploadCannedMessagesResponseDto } from './dto/bulk-upload-canned-messages.dto';
import { 
  BulkDeleteCannedMessagesDto, 
  BulkDeleteCannedMessagesResponseDto 
} from './dto/bulk-delete-canned-messages.dto';
import { ExportCannedMessagesDto, ExportCannedMessagesResponseDto } from './dto/export-canned-messages.dto';
import { ImportCannedMessagesResponseDto, ImportCannedMessagesDto } from './dto/import-canned-messages.dto';
import { GetAgentsDto } from './dto/get-agents.dto';
import { GetAgentMetricsDto } from './dto/get-agent-metrics.dto';
import {
  AgentProfileResponseDto,
  CannedMessageResponseDto,
  AgentStatusResponseDto,
} from './dto/agent-responses.dto';
import { AgentMetricsResponseDto } from './dto/agent-metrics-response.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service'; // For password updates
import { UpdateUserDto } from 'src/users/dto/update-user.dto';
import { Types } from 'mongoose';
import { ChatNotificationService } from '../chat/services/chat-notification/chat-notification.service';
import { createProfilePictureUploadInterceptor, createCsvUploadInterceptor, createExcelUploadInterceptor } from '../shared/interceptors/file-upload.interceptor';
import { getProfilePictureUrl } from '../shared/utils/file-upload.utils';
import { AdminResolverUtil } from '../shared/utils/admin-resolver.util';
import { ImageProcessingService } from '../shared/services/image-processing.service';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  SuccessMessageResponseDto,
  PaginatedResponseDto,
} from '../shared/dto/common-responses.dto';
import { User } from 'src/schemas/user.schema';

@ApiTags('Agents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(
    private readonly agentsService: AgentsService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => ChatNotificationService))
    private readonly chatNotificationService: ChatNotificationService,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get agents with pagination and filtering (Admin/Manager only)',
    description:
      'Retrieve a paginated list of agent profiles with associated user details. Supports filtering by search term, departments, online status, blocked status, and sorting options. Only accessible by administrators and managers.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search text to filter agents by name or email',
    example: 'john',
  })
  @ApiQuery({
    name: 'departmentIds',
    required: false,
    description: 'Comma-separated list of department IDs to filter by',
    example: '507f1f77bcf86cd799439011,507f1f77bcf86cd799439012',
  })
  @ApiQuery({
    name: 'isOnline',
    required: false,
    description: 'Filter by online status',
    example: true,
    type: Boolean,
  })
  @ApiQuery({
    name: 'isBlocked',
    required: false,
    description: 'Filter by blocked status',
    example: false,
    type: Boolean,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by',
    example: 'createdAt',
    enum: [
      'createdAt',
      'updatedAt',
      'firstName',
      'lastName',
      'email',
      'isOnline',
      'lastSeen',
    ],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @ApiResponse({
    status: 200,
    description: 'Agents retrieved successfully with pagination',
    type: PaginatedResponseDto<AgentProfileResponseDto>,
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
    description: 'Admin or Manager role required',
    type: ForbiddenResponseDto,
  })
  async getAllAgentsWithProfiles(
    @AuthenticatedUser() adminUser: JwtPayload,
    @Query() queryDto: GetAgentsDto,
  ) {
    // Resolve adminId - handles both ADMIN and MANAGER roles
    const adminId = await AdminResolverUtil.resolveAdminId(
      adminUser,
      this.agentsService,
    );
    return this.agentsService.getAgentsWithPagination(adminId, queryDto);
  }

  @Get('me/profile')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
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
    description: 'Agent, Admin, or Manager role required',
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
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
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

    // Handle USER schema fields (firstName, lastName, email) - only for admins and managers
    if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
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
      const updatedProfile =
        await this.agentsService.updateAgentProfileByUserId(
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
    const updatedProfile = await this.agentsService.updateAgentProfileByUserId(
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update agent profile by admin',
    description:
      'Update any agent profile by admin or manager. Supports updating all agent profile fields including shifts, timezone, departments, domain access, and user details (firstName, lastName, email, password, role). Admin or manager can only update profiles they created. Note: Only ADMIN users can change roles, not MANAGER users.',
  })
  @ApiBody({
    type: UpdateAgentProfileDto,
    description:
      'Agent profile update data with optional user fields (firstName, lastName, email, password, role). Role changes are restricted to ADMIN users only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent profile updated successfully',
    type: AgentProfileResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid agent ID format, agent not found, unauthorized access, or managers attempting to change roles',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Agent profile not found',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin or Manager role required',
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
      role?: UserRole;
    },
  ) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new BadRequestException('Invalid agent ID format');
    }

    // Resolve adminId - handles both ADMIN and MANAGER roles
    const resolvedAdminId = await AdminResolverUtil.resolveAdminId(
      adminUser,
      this.agentsService,
    );

    // First check if the agent profile exists using agentId (not userId)
    const existingAgentProfile =
      await this.agentsService.findAgentProfileById(agentId);
    if (!existingAgentProfile) {
      throw new NotFoundException(`Agent profile with ID ${agentId} not found`);
    }

    // Check if the current admin is the one who created this agent profile
    if (
      existingAgentProfile.adminId &&
      existingAgentProfile.adminId.toString() !== resolvedAdminId
    ) {
      Logger.warn(
        `User ${adminUser.sub} (role: ${adminUser.role}) attempted to update agent ${agentId} created by admin ${existingAgentProfile.adminId}`,
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
      userToUpdate.role !== UserRole.ADMIN &&
      userToUpdate.role !== UserRole.MANAGER
    ) {
      throw new BadRequestException(
        'This user is not an agent, admin or manager.',
      );
    }

    // Check if role change is attempted - only ADMIN can change roles
    if (updateDto.role !== undefined) {
      if (adminUser.role !== UserRole.ADMIN) {
        throw new BadRequestException(
          'Only administrators can change user roles. Managers do not have permission to modify roles.',
        );
      }
      // Log role change attempt for audit purposes
      this.logger.log(
        `Admin ${adminUser.sub} is changing role of user ${userId} from ${userToUpdate.role} to ${updateDto.role}`,
      );
    }

    // Handle USER schema fields (firstName, lastName, email, password, role)
    const userUpdatePayload: UpdateUserDto = {};
    if (updateDto.password) userUpdatePayload.password = updateDto.password;
    if (updateDto.firstName) userUpdatePayload.firstName = updateDto.firstName;
    if (updateDto.lastName) userUpdatePayload.lastName = updateDto.lastName;
    if (updateDto.email) userUpdatePayload.email = updateDto.email;
    if (updateDto.role) userUpdatePayload.role = updateDto.role;

    // Update user fields if any are provided
    if (Object.keys(userUpdatePayload).length > 0) {
      await this.usersService.update(userId.toString(), userUpdatePayload);
    }

    // Handle isOnline field separately using setOnlineStatus for validation, maybe addtry/catch
    if (typeof updateDto.isOnline === 'boolean') {
      await this.agentsService.setOnlineStatus(
        userId.toString(),
        updateDto.isOnline,
      );

      // Notify the agent about the status change via socket
      await this.chatNotificationService.notifyAgentAboutStatusChangeByAdmin(
        userId.toString(),
        updateDto.isOnline,
        resolvedAdminId,
      );
    }

    // Handle AGENT PROFILE schema fields (departmentIds, domainAccess, maxConcurrentChats, etc.)
    const agentProfileUpdatePayload: UpdateAgentProfileDto = { ...updateDto };
    // Remove user-specific fields from agent profile payload
    delete agentProfileUpdatePayload['password'];
    delete agentProfileUpdatePayload['firstName'];
    delete agentProfileUpdatePayload['lastName'];
    delete agentProfileUpdatePayload['email'];
    // Remove isOnline as it's handled separately above
    delete agentProfileUpdatePayload['isOnline'];

    // Update agent profile fields with agentId directly (only if there are fields to update)
    let updatedProfile;
    if (Object.keys(agentProfileUpdatePayload).length > 0) {
      updatedProfile = await this.agentsService.updateAgentProfileById(
        agentId,
        agentProfileUpdatePayload,
      );
    } else {
      // If no profile fields to update, just get the current profile
      updatedProfile = await this.agentsService.findAgentProfileById(agentId);
    }

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
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER) // Both agents and admins can set status
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
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(createProfilePictureUploadInterceptor())
  @ApiOperation({
    summary: 'Upload profile picture',
    description:
      'Upload a profile picture for the authenticated agent. Supports JPG, JPEG, PNG, GIF, and WebP formats. Maximum file size: 5MB. The uploaded file will be automatically converted to WebP format, resized to 400x400 pixels, and optimized for web delivery.',
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
          description:
            'Profile picture file (JPG, JPEG, PNG, GIF, WebP) - will be converted to WebP',
        },
      },
      required: ['profilePicture'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Profile picture uploaded and converted to WebP successfully',
    schema: {
      type: 'object',
      properties: {
        profilePictureUrl: {
          type: 'string',
          example: '/uploads/profile-pictures/agent-123-1234567890.webp',
          description: 'URL path to the uploaded profile picture (WebP format)',
        },
        message: {
          type: 'string',
          example: 'Profile picture uploaded and processed successfully',
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
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  async uploadProfilePicture(
    @AuthenticatedUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      this.logger.log(
        `Processing profile picture upload for user: ${user.sub}`,
      );

      // Get the agent profile to check for existing profile picture
      const agentProfile = await this.agentsService.findAgentProfileByUserId(
        user.sub,
      );

      // Process the uploaded image (convert to WebP, resize, optimize)
      const webpFilename =
        await this.imageProcessingService.processProfilePicture(
          file.path,
          user.sub,
        );

      // Generate the public URL for the WebP file
      const profilePictureUrl = getProfilePictureUrl(webpFilename);

      this.logger.log(
        `Profile picture uploaded successfully for user: ${user.sub}`,
      );

      return {
        profilePictureUrl,
        message: 'Profile picture uploaded and processed successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to upload profile picture for user ${user.sub}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== CANNED MESSAGES ENDPOINTS ====================

  @Post('canned-messages')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
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
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  async createCannedMessage(
    @AuthenticatedUser() user: JwtPayload,
    @Body() createDto: CreateCannedMessageDto,
  ) {
return this.agentsService.createCannedMessage(user.sub, createDto);
  }

  /**
   * Bulk upload canned messages from CSV file
   */
  @Post('canned-messages/bulk-upload')
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @UseInterceptors(createCsvUploadInterceptor())
  @ApiOperation({
    summary: 'Bulk upload canned messages from CSV file',
    description:
      'Upload a CSV file containing canned messages to create multiple messages at once. The CSV should contain shortCode (mapped to title) and message (mapped to content) columns. All uploaded messages will be set as global with empty departments and tags. If any entries fail, a CSV file with failed results will be generated and a download URL will be provided in the response.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'CSV file containing canned messages',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file with canned messages (shortCode, message columns)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk upload completed successfully',
    type: BulkUploadCannedMessagesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid CSV file or format',
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
  async bulkUploadCannedMessages(
    @AuthenticatedUser() user: JwtPayload,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No CSV file provided');
    }

    this.logger.log(
      `User ${user.email} initiated bulk upload of canned messages from file: ${file.originalname}`,
    );

    return this.agentsService.bulkUploadCannedMessages(
      user.sub,
      file.path,
    );
  }

  /**
   * Export canned messages to Excel file
   */
  @Get('canned-messages/export')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Export canned messages to Excel file',
    description:
      'Export all canned messages to an Excel file with title and content fields only. Supports filtering by departments, global status, search terms, and tags. Uses batch processing for large datasets.',
  })
  @ApiResponse({
    status: 200,
    description: 'Canned messages exported successfully',
    type: ExportCannedMessagesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'No canned messages found matching criteria',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  async exportCannedMessages(
    @AuthenticatedUser() user: JwtPayload,
    @Query() exportDto: ExportCannedMessagesDto,
  ) {
    this.logger.log(
      `User ${user.email} initiated export of canned messages with filters: ${JSON.stringify(exportDto)}`,
    );

    return this.agentsService.exportCannedMessages(user.sub, exportDto);
  }

  /**
   * Import canned messages from Excel file
   */
  @Post('canned-messages/import')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(createExcelUploadInterceptor())
  @ApiOperation({
    summary: 'Import canned messages from Excel file',
    description:
      'Import canned messages from an Excel file. The Excel file should contain Title and Content columns. All imported messages will be set as global with empty departments and tags. Uses batch processing for large datasets. If any entries fail, an Excel file with failed results will be generated.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Excel file containing canned messages',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Excel file with canned messages (Title, Content columns)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk import completed successfully',
    type: ImportCannedMessagesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid Excel file or format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  async importCannedMessages(
    @AuthenticatedUser() user: JwtPayload,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No Excel file provided');
    }

    this.logger.log(
      `User ${user.email} initiated import of canned messages from file: ${file.originalname}`,
    );

    return this.agentsService.importCannedMessages(user.sub, file.path);
  }

  /**
   * Get canned messages with pagination and filtering
   */
  @Get('canned-messages')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
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
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  async getCannedMessages(
    @AuthenticatedUser() user: JwtPayload,
    @Query() queryDto: GetCannedMessagesDto,
  ) {
    this.logger.debug('Received request to fetch canned messages');
    return this.agentsService.getCannedMessages(user.sub, queryDto);
  }

  /**
   * Get a specific canned message by ID
   */
  @Get('canned-messages/:id')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  async getCannedMessageById(
    @AuthenticatedUser() user: JwtPayload,
    @Param('id') messageId: string,
  ) {
    if (!Types.ObjectId.isValid(messageId)) {
      throw new BadRequestException('Invalid message ID format');
    }
    this.logger.debug(`Fetching canned message with ID: ${messageId}`);
    return this.agentsService.getCannedMessageById(user.sub, messageId);
  }

  /**
   * Update a canned message
   */
  @Put('canned-messages/:id')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
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
    description:
      'Agent, Admin, or Manager role required, or not the message creator',
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
   * Bulk delete canned messages
   */
  @Delete('canned-messages/bulk')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Bulk delete canned messages',
    description:
      'Delete multiple canned messages at once. Returns detailed results including success/failure counts and error messages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk delete operation completed',
    type: BulkDeleteCannedMessagesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or message ID format',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  async bulkDeleteCannedMessages(
    @AuthenticatedUser() user: JwtPayload,
    @Body() bulkDeleteDto: BulkDeleteCannedMessagesDto,
  ) {
    this.logger.log(
      `User ${user.email} initiated bulk delete of ${bulkDeleteDto.messageIds.length} canned messages`,
    );

    return this.agentsService.bulkDeleteCannedMessages(
      user.sub,
      bulkDeleteDto.messageIds,
    );
  }

  /**
   * Delete a canned message
   */
  @Delete('canned-messages/:id')
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
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
  @Roles(UserRole.AGENT, UserRole.ADMIN, UserRole.MANAGER)
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
    description: 'Agent, Admin, or Manager role required',
    type: ForbiddenResponseDto,
  })
  async getMyAvailability(@AuthenticatedUser() user: JwtPayload) {
    return this.agentsService.isAgentCurrentlyAvailable(user.sub);
  }

  @Patch(':agentId/block')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Block/Unblock agent account (Admin/Manager only)',
    description:
      'Block or unblock an agent account. When blocked, the agent cannot access the system or handle chats. Only accessible by administrators and managers.',
  })
  @ApiParam({
    name: 'agentId',
    description: 'The unique identifier of the agent',
    type: 'string',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({
    description: 'Block status data',
    schema: {
      type: 'object',
      properties: {
        isBlocked: {
          type: 'boolean',
          description: 'Whether to block (true) or unblock (false) the agent',
          example: true,
        },
      },
      required: ['isBlocked'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Agent block status updated successfully',
    type: SuccessMessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid agent ID format or missing isBlocked field',
    type: ErrorResponseDto,
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
    description: 'Admin or Manager role required',
    type: ForbiddenResponseDto,
  })
  async blockUnblockAgent(
    @Param('agentId') agentId: string,
    @AuthenticatedUser() adminUser: JwtPayload,
    @Body() body: { isBlocked: boolean },
  ) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new BadRequestException('Invalid agent ID format');
    }

    if (typeof body.isBlocked !== 'boolean') {
      throw new BadRequestException('isBlocked must be a boolean value');
    }

    const result = await this.agentsService.blockUnblockAgent(
      agentId,
      body.isBlocked,
      adminUser.sub,
    );

    const action = body.isBlocked ? 'blocked' : 'unblocked';
    return {
      message: `Agent has been ${action} successfully`,
      agentId: result._id,
      isBlocked: result.isBlocked,
    };
  }

  @Get(':agentId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get agent profile by ID (Admin/Manager only)',
    description:
      'Retrieve a specific agent profile with associated user details by agent ID. Only accessible by administrators and managers.',
  })
  @ApiParam({
    name: 'agentId',
    description: 'The unique identifier of the agent',
    type: 'string',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent profile retrieved successfully',
    type: AgentProfileResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid agent ID format',
    type: ErrorResponseDto,
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
    description: 'Admin or Manager role required',
    type: ForbiddenResponseDto,
  })
  async getAgentById(
    @Param('agentId') agentId: string,
    @AuthenticatedUser() adminUser: JwtPayload,
  ) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new BadRequestException('Invalid agent ID format');
    }

    const agentProfile = await this.agentsService.findAgentProfileById(agentId);
    if (!agentProfile) {
      throw new NotFoundException(`Agent profile with ID ${agentId} not found`);
    }

    // Get the userId from the agent profile
    const userId = agentProfile.userId;
    if (!userId) {
      throw new BadRequestException(
        'This agent profile is not associated with a user',
      );
    }

    // Get user details to return combined response
    const userDetails = await this.usersService.findById(userId);
    return {
      ...agentProfile.toObject(),
      user: userDetails
        ? {
            email: userDetails.email,
            firstName: userDetails.firstName,
            lastName: userDetails.lastName,
            role: userDetails.role,
          }
        : null,
    };
  }

  /**
   * Get agent metrics with domain-wise breakdown
   */
  @Get(':agentId/metrics')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Get agent metrics by domain (Admin only)',
    description:
      'Retrieve agent performance metrics broken down by domain with time-based filtering. Includes accepted chats, responded chats, average response time, and proactive chats. Only accessible by administrators.',
  })
  @ApiParam({
    name: 'agentId',
    description: 'Agent Profile ID to get metrics for',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiQuery({
    name: 'timeFilter',
    description: 'Time period filter for metrics',
    example: 'last_week',
    enum: ['today', 'last_week', 'last_month'],
  })
  @ApiQuery({
    name: 'domain',
    required: false,
    description: 'Filter by specific domain',
    example: 'allureesthetic.com',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 10,
    type: Number,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Field to sort by',
    example: 'acceptedChats',
    enum: [
      'domain',
      'acceptedChats',
      'respondedChats',
      'avgResponseTime',
      'proactiveChats',
      'totalBookings',
    ],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @ApiResponse({
    status: 200,
    description: 'Agent metrics retrieved successfully with pagination',
    type: AgentMetricsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid agent ID format or query parameters',
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
  @ApiNotFoundResponse({
    description: 'Agent not found',
    type: NotFoundResponseDto,
  })
  async getAgentMetrics(
    @Param('agentId') agentId: string,
    @AuthenticatedUser() adminUser: JwtPayload,
    @Query() queryDto: GetAgentMetricsDto,
  ) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new BadRequestException('Invalid agent ID format');
    }

    // Verify agent exists
    const agentProfile = await this.agentsService.findAgentProfileById(agentId);
    if (!agentProfile) {
      throw new NotFoundException(`Agent profile with ID ${agentId} not found`);
    }

    return this.agentsService.getAgentMetrics(
      agentProfile.userId.toString(),
      queryDto,
    );
  }
}
