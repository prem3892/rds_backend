import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AgentProfile,
  AgentProfileDocument,
} from 'src/schemas/agent-profile.schema';
import {
  CannedMessage,
  CannedMessageDocument,
} from 'src/schemas/canned-message.schema';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { CreateCannedMessageDto } from './dto/create-canned-message.dto';
import { UpdateCannedMessageDto } from './dto/update-canned-message.dto';
import { GetCannedMessagesDto } from './dto/get-canned-messages.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../shared/constants/enums';
import { DepartmentsService } from 'src/departments/departments.service';
import { ChatSessionService } from 'src/chat/services/chat-session/chat-session.service';
import { WidgetsService } from 'src/widgets/widgets.service';
import { CustomersService } from 'src/customers/customers.service';
import { ShiftService } from '../shared/services/shift.service';
const { parse } = require('csv-parse/sync');
import { readFileSync, unlinkSync } from 'fs';
import { BulkUploadCannedMessagesResponseDto } from './dto/bulk-upload-canned-messages.dto';
import { generateFailedResultsCsv, saveFailedResultsCsv, cleanCsvContent } from '../shared/utils/file-upload.utils';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  constructor(
    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,
    @InjectModel(CannedMessage.name)
    private cannedMessageModel: Model<CannedMessageDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly departmentsService: DepartmentsService,
    @Inject(forwardRef(() => ChatSessionService))
    private readonly chatSessionService: ChatSessionService,
    private readonly widgetsService: WidgetsService,
    @Inject(forwardRef(() => CustomersService))
    private readonly customersService: CustomersService,
    private readonly shiftService: ShiftService,
  ) {}

  async createAgentProfile(
    userId: Types.ObjectId,
    adminId?: Types.ObjectId, // should be optional ?
    initialProfileData: Partial<AgentProfile> = {},
  ): Promise<AgentProfileDocument> {
    const user = await this.usersService.findById(userId);
    if (
      !user ||
      (user.role !== UserRole.AGENT && user.role !== UserRole.ADMIN)
    ) {
      throw new BadRequestException(
        'User is not an Agent/Admin or does not exist.',
      );
    }

    // If adminId is not provided, use the userId itself (for self-registration or admin creating their own profile)
    const effectiveAdminId = adminId || userId;

    const existingProfile = await this.agentProfileModel
      .findOne({ userId })
      .exec();
    if (existingProfile) {
      // Potentially update if called again, or throw ConflictException
      // For now, let's assume it can be updated if called again with new data
      Object.assign(existingProfile, initialProfileData, {
        userId,
        adminId: effectiveAdminId,
      }); // Ensure userId and adminId are set
      return existingProfile.save();
    }

    const agentProfile = new this.agentProfileModel({
      ...initialProfileData,
      userId: userId, // Explicitly set userId
      adminId: effectiveAdminId, // Set adminId
    });
    return agentProfile.save();
  }

  async deleteAgentProfile(
    userId: Types.ObjectId,
  ): Promise<AgentProfileDocument | null> {
    return this.agentProfileModel.findByIdAndDelete(userId).exec();
  }

  async findAgentProfileById(
    agentId: string | Types.ObjectId,
  ): Promise<AgentProfileDocument | null> {
    // handle the string agentId as a Types.ObjectId if provided as a string
    this.logger.log(`Finding agent profile for agent ID ${agentId}`);
    if (typeof agentId === 'string') agentId = new Types.ObjectId(agentId);

    return this.agentProfileModel
      .findById(agentId)
      .populate('departmentIds')
      .exec();
  }

  /**
   * Find agent profile by user ID.
   * Note: Departments are populated here
   */
  async findAgentProfileByUserId(
    userId: string | Types.ObjectId,
  ): Promise<AgentProfileDocument | null> {
    // handle the string userId as a Types.ObjectId
    this.logger.log(`Finding agent profile for user ID ${userId}`);
    let _id: Types.ObjectId;
    if (typeof userId === 'string') _id = new Types.ObjectId(userId);
    else _id = userId;

    this.logger.debug(`Convertedd userId to Types.ObjectId: ${_id}`);

    return this.agentProfileModel
      .findOne({ userId: _id })
      .populate('departmentIds')
      .exec();
  }

  async findAgentProfileByUserIdOrFail(
    userId: string | Types.ObjectId,
  ): Promise<AgentProfileDocument> {
    const profile = await this.findAgentProfileByUserId(userId);

    this.logger.debug(
      `[findAgentProfileByUserIdOrFail] Found agent profile for user ID ${userId}:`,
      profile,
    );

    if (!profile) {
      this.logger.error(
        `Agent profile for user ID ${userId} ${typeof userId} not found.`,
      );
      throw new NotFoundException(
        `Agent profile for user ID ${userId} not found.`,
      );
    }
    return profile;
  }

  async findAgentProfileByIdOrFail(
    agentId: string | Types.ObjectId,
  ): Promise<AgentProfileDocument> {
    const profile = await this.findAgentProfileById(agentId);
    if (!profile) {
      throw new NotFoundException(
        `Agent profile for user ID ${agentId} not found.`,
      );
    }
    return profile;
  }

  async getAgentName(userId: string | Types.ObjectId): Promise<string> {
    const user = await this.usersService.findById(userId);
    return `${user?.firstName} ${user?.lastName}`;
  }

  async getAllAgentProfilesWithUserDetails(
    adminId: string | Types.ObjectId,
  ): Promise<any[]> {
    this.logger.log(`Getting all agent profiles for admin ${adminId}`);

    // if adminId is not ObjectId, convert it to ObjectId
    if (typeof adminId === 'string') adminId = new Types.ObjectId(adminId);

    // Get all agent profiles for the given adminId
    const agentProfiles = await this.agentProfileModel
      .find({ adminId })
      //.populate('departmentIds')
      .lean()
      .exec();

    this.logger.debug(
      `Fetched ${agentProfiles.length} agent profiles for admin ${adminId}.`,
    );

    const userIds = agentProfiles.map((profile) => profile.userId);

    const users = await this.usersService.findManyByIds(userIds);

    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    return agentProfiles.map((profile) => {
      const userDetails = userMap.get(profile.userId.toString());
      return {
        ...profile,
        user: userDetails
          ? {
              _id: userDetails._id,
              firstName: userDetails.firstName,
              lastName: userDetails.lastName,
              email: userDetails.email,
              role: userDetails.role,
              isEmailVerified: userDetails.isEmailVerified,
            }
          : null, // Attach only specific user fields
      };
    });
  }

  async updateAgentProfileByUserId(
    agentUserId: string | Types.ObjectId,
    updateDto: UpdateAgentProfileDto,
    isAdminUpdate: boolean = false, // to distinguish admin updates from agent's own
  ): Promise<AgentProfileDocument> {
    this.logger.log(
      `Updating agent profile for user ID ${agentUserId}:`,
      updateDto,
    );

    if (typeof agentUserId === 'string')
      agentUserId = new Types.ObjectId(agentUserId);

    const agentProfile = await this.agentProfileModel
      .findOne({ userId: agentUserId })
      .exec();

    this.logger.log(
      `Found agent profile for user ID ${agentUserId}:`,
      agentProfile,
    );
    if (!agentProfile) {
      throw new NotFoundException(
        `Agent profile for user ID ${agentUserId} not found.`,
      );
    }

    if (updateDto.departmentIds) {
      if (updateDto.departmentIds.length > 0) {
        const departments = await this.departmentsService.findByIds(
          updateDto.departmentIds.map((id) => new Types.ObjectId(id)),
        );
        if (departments.length !== updateDto.departmentIds.length) {
          throw new BadRequestException(
            'One or more department IDs are invalid.',
          );
        }
      }
      agentProfile.departmentIds = updateDto.departmentIds.map(
        (id) => new Types.ObjectId(id),
      );
    }

    if (updateDto.domainAccess)
      agentProfile.domainAccess = updateDto.domainAccess;

    this.logger.log(
      `Updating agent profile for user ID ${agentUserId} with DTO: ${JSON.stringify(updateDto)}`,
    );
    if (typeof updateDto.isOnline === 'boolean') {
      agentProfile.isOnline = updateDto.isOnline;
      if (updateDto.isOnline === false || updateDto.isOnline === true) {
        // only update lastSeen if status actually changes or set
        agentProfile.lastSeen = new Date();
      }
    }
    if (typeof updateDto.isBlocked === 'boolean') {
      agentProfile.isBlocked = updateDto.isBlocked;
      // If blocking the agent, also set them offline
      if (updateDto.isBlocked) {
        agentProfile.isOnline = false;
        agentProfile.lastSeen = new Date();
      }
    }
    if (updateDto.maxConcurrentChats)
      agentProfile.maxConcurrentChats = updateDto.maxConcurrentChats;
    if (updateDto.shifts) {
      // Convert array of DayShiftEntryDto to array of DayShiftEntry
      agentProfile.shifts = updateDto.shifts.map((shiftDto) => ({
        dayOfWeek: shiftDto.dayOfWeek,
        isWorkingDay: shiftDto.isWorkingDay ?? false,
        timeSlots: shiftDto.timeSlots ?? [],
        isActive: shiftDto.isActive ?? true,
        priority: shiftDto.priority ?? 1,
        description: shiftDto.description,
      }));
    }
    if (updateDto.timezone) agentProfile.timezone = updateDto.timezone;
    if (updateDto.profilePicture)
      agentProfile.profilePicture = updateDto.profilePicture;

    return agentProfile.save();
  }

  async updateAgentProfileById(
    agentId: string,
    updateDto: UpdateAgentProfileDto,
    isAdminUpdate: boolean = false, // to distinguish admin updates from agent's own
  ): Promise<AgentProfileDocument> {
    const agentProfile = await this.findAgentProfileById(agentId);
    if (!agentProfile) {
      throw new NotFoundException(
        `Agent profile for user ID ${agentId} not found.`,
      );
    }

    if (updateDto.departmentIds) {
      if (updateDto.departmentIds.length > 0) {
        const departments = await this.departmentsService.findByIds(
          updateDto.departmentIds.map((id) => new Types.ObjectId(id)),
        );
        if (departments.length !== updateDto.departmentIds.length) {
          throw new BadRequestException(
            'One or more department IDs are invalid.',
          );
        }
      }
      agentProfile.departmentIds = updateDto.departmentIds.map(
        (id) => new Types.ObjectId(id),
      );
    }

    if (updateDto.domainAccess)
      agentProfile.domainAccess = updateDto.domainAccess;

    this.logger.debug(
      `Updating agent profile for user ID ${agentId} with DTO: ${JSON.stringify(updateDto)}`,
    );

    if (typeof updateDto.isOnline === 'boolean') {
      agentProfile.isOnline = updateDto.isOnline;
      if (updateDto.isOnline === false || updateDto.isOnline === true) {
        // only update lastSeen if status actually changes or set
        agentProfile.lastSeen = new Date();
      }
    }
    if (typeof updateDto.isBlocked === 'boolean') {
      agentProfile.isBlocked = updateDto.isBlocked;
      // If blocking the agent, also set them offline
      if (updateDto.isBlocked) {
        agentProfile.isOnline = false;
        agentProfile.lastSeen = new Date();
      }
    }
    if (updateDto.maxConcurrentChats)
      agentProfile.maxConcurrentChats = updateDto.maxConcurrentChats;
    if (updateDto.shifts) {
      // Convert array of DayShiftEntryDto to array of DayShiftEntry
      agentProfile.shifts = updateDto.shifts.map((shiftDto) => ({
        dayOfWeek: shiftDto.dayOfWeek,
        isWorkingDay: shiftDto.isWorkingDay ?? false,
        timeSlots: shiftDto.timeSlots ?? [],
        isActive: shiftDto.isActive ?? true,
        priority: shiftDto.priority ?? 1,
        description: shiftDto.description,
      }));
    }
    if (updateDto.timezone) agentProfile.timezone = updateDto.timezone;
    if (updateDto.profilePicture)
      agentProfile.profilePicture = updateDto.profilePicture;

    return agentProfile.save();
  }

  async setOnlineStatus(
    agentUserId: string,
    isOnline: boolean,
  ): Promise<AgentProfileDocument> {
    const agentProfile = await this.agentProfileModel
      .findOne({ userId: new Types.ObjectId(agentUserId) })
      .populate('departmentIds')
      .exec();

    this.logger.log(
      `Setting online status for agent ${agentProfile?.userId}: ${isOnline}`,
    );
    if (!agentProfile) {
      throw new NotFoundException(
        `Agent profile for user ID ${agentUserId} not found.`,
      );
    }

    // Check if agent is blocked
    if (agentProfile.isBlocked) {
      throw new ForbiddenException(
        'Your account has been blocked. Please contact your administrator.',
      );
    }

    // If trying to go online, check if agent is within shift
    if (isOnline) {
      const availabilityStatus =
        await this.isAgentCurrentlyAvailable(agentUserId);

      if (!availabilityStatus.isWithinShift) {
        const nextAvailableMessage = availabilityStatus.nextAvailableTime
          ? ` Your next available time is ${availabilityStatus.nextAvailableTime.toLocaleString()}.`
          : ' Please check your shift schedule.';

        throw new ForbiddenException(
          `Cannot go online outside of shift hours.${nextAvailableMessage}`,
        );
      }
    }

    agentProfile.isOnline = isOnline;
    agentProfile.lastSeen = new Date();
    return agentProfile.save();
  }

  async getEligibleOnlineAgents(
    widgetId: Types.ObjectId,
    domain: string,
  ): Promise<AgentProfileDocument[]> {
    // First get the widget to access its departmentIds
    const widget = await this.widgetsService.findById(widgetId);
    if (!widget) {
      this.logger.error(
        `Widget with ID ${widgetId} not found when finding eligible agents`,
      );
      return [];
    }

    this.logger.debug(
      `Got widget ${JSON.stringify(widget)} for widgetId ${widgetId}`,
    );

    // Find all online agents from the same organization as the widget
    const onlineAgents = await this.agentProfileModel
      .find({
        isOnline: true, // First check: agent must be online
        isBlocked: { $ne: true }, // Exclude blocked agents
        adminId: widget.createdBy, // CRITICAL: Only agents from the same organization
      })
      .exec();

    this.logger.debug(
      `Found ${onlineAgents.length} online agents from organization ${widget.createdBy} for widget ${widgetId}`,
    );

    // Filter agents by department match and domain access
    const departmentAndDomainEligibleAgents = onlineAgents.filter((agent) => {
      // Second check: at least one department must match between agent and widget
      const hasDepartmentMatch = agent.departmentIds.some((agentDeptId) =>
        widget.departmentIds.some(
          (widgetDept) => agentDeptId.toString() === widgetDept._id.toString(),
        ),
      );

      this.logger.debug(`Has Department Match? ${hasDepartmentMatch}`);

      // Third check: agent must have access to the domain or wildcard
      const hasDomainAccess =
        agent.domainAccess.includes('*') || agent.domainAccess.includes(domain);

      this.logger.debug(`Has Domain Access? ${hasDomainAccess}`);

      return hasDepartmentMatch && hasDomainAccess;
    });

    this.logger.debug(
      `After filtering, we got ${departmentAndDomainEligibleAgents.length} agents`,
    );

    // Further filter by maxConcurrentChats and shift availability
    const eligibleAgents: AgentProfileDocument[] = [];
    for (const agent of departmentAndDomainEligibleAgents) {
      const activeChats =
        await this.chatSessionService.countActiveChatsForAgent(agent.userId);

      // Check if agent is within their working hours
      const isWithinShift =
        agent.shifts && agent.shifts.length > 0
          ? this.shiftService.isAgentAvailable(agent.shifts, agent.timezone)
          : true; // If no shifts defined, assume always available

      this.logger.debug(
        `Agent ${agent.userId} - Active chats: ${activeChats}/${agent.maxConcurrentChats}, Within shift: ${isWithinShift}`,
      );

      if (activeChats < agent.maxConcurrentChats && isWithinShift) {
        eligibleAgents.push(agent);
      }
    }

    this.logger.log(
      `Found ${eligibleAgents.length} eligible agents from organization ${widget.createdBy} for widget ${widgetId} and domain ${domain}`,
    );
    return eligibleAgents;
  }

  /**
   * Check if an agent is currently available based on their shift schedule
   */
  async isAgentCurrentlyAvailable(agentId: string): Promise<{
    isAvailable: boolean;
    isWithinShift: boolean;
    isOnline: boolean;
    nextAvailableTime?: Date;
  }> {
    const agent = await this.findAgentProfileByUserId(agentId);
    if (!agent) {
      return {
        isAvailable: false,
        isWithinShift: false,
        isOnline: false,
      };
    }
    ``;

    if (agent.shifts && agent.shifts.length > 0) {
      this.logger.debug(
        `Checking availability for agent ${agent.userId} with shifts ${agent.shifts}`,
      );
    }

    const isWithinShift =
      agent.shifts && agent.shifts.length > 0
        ? this.shiftService.isAgentAvailable(agent.shifts, agent.timezone)
        : true;

    this.logger.debug(
      `Agent ${agent.userId} is within shift: ${isWithinShift}`,
    );

    const nextAvailableTime =
      agent.shifts && !isWithinShift
        ? this.shiftService.getNextAvailableTime(
            agent.shifts,
            agent.timezone,
          ) || undefined
        : undefined;

    return {
      isAvailable: agent.isOnline && isWithinShift,
      isWithinShift,
      isOnline: agent.isOnline,
      nextAvailableTime,
    };
  }

  /**
   * Get all widgets accessible by an agent based on their department assignments
   */
  async getAgentAccessibleWidgets(agentId: string): Promise<any[]> {
    try {
      const agent = await this.findAgentProfileByUserId(agentId);
      if (!agent) {
        this.logger.warn(`Agent not found: ${agentId}`);
        return [];
      }

      this.logger.debug(
        `Found agent ${agent.userId} with departments ${agent.departmentIds}`,
      );

      // Get all widgets that have at least one department matching the agent's departments
      const widgets = await this.widgetsService.findWidgetsByDepartments(
        agent.departmentIds.map((dept) => dept._id.toString()),
      );

      this.logger.debug(
        `Found ${widgets.length} accessible widgets for agent ${agentId}`,
      );

      return widgets;
    } catch (error) {
      this.logger.error(
        `Failed to get accessible widgets for agent ${agentId}: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * Check if an agent can access a specific customer based on widget permissions
   */
  async canAgentAccessCustomer(
    agentUserId: string,
    customerId: string,
  ): Promise<{
    canAccess: boolean;
    reason?: string;
    widget?: any;
    customer?: any;
  }> {
    try {
      // 1. Get agent profile
      const agentProfile = await this.findAgentProfileByUserId(agentUserId);
      if (!agentProfile) {
        return { canAccess: false, reason: 'Agent profile not found' };
      }

      // 2. Get customer and their widget
      const customer = await this.customersService.findById(customerId);
      if (!customer) {
        return { canAccess: false, reason: 'Customer not found' };
      }

      if (customer.isBlocked) {
        return { canAccess: false, reason: 'Customer is blocked', customer };
      }

      // 3. Get widget
      const widget = await this.widgetsService.findById(customer.widgetId);
      if (!widget) {
        return { canAccess: false, reason: 'Widget not found', customer };
      }

      // 4. Check department overlap
      const hasDepartmentMatch = agentProfile.departmentIds.some(
        (agentDeptId) =>
          widget.departmentIds.some(
            (widgetDeptId) =>
              agentDeptId.toString() === widgetDeptId.toString(),
          ),
      );

      if (!hasDepartmentMatch) {
        return {
          canAccess: false,
          reason: 'No department access',
          widget,
          customer,
        };
      }

      // 5. Check domain access
      const customerDomain = customer.metadata?.initialDomain || 'unknown';
      const hasDomainAccess =
        agentProfile.domainAccess.includes('*') ||
        agentProfile.domainAccess.includes(customerDomain);

      if (!hasDomainAccess) {
        return {
          canAccess: false,
          reason: 'No domain access',
          widget,
          customer,
        };
      }

      return { canAccess: true, widget, customer };
    } catch (error) {
      this.logger.error(
        `Error validating agent access for agent ${agentUserId} and customer ${customerId}: ${error.message}`,
        error.stack,
      );
      return { canAccess: false, reason: `Validation error: ${error.message}` };
    }
  }

  // ==================== CANNED MESSAGES METHODS ====================

  /**
   * Create a new canned message
   */
  async createCannedMessage(
    agentUserId: string,
    createDto: CreateCannedMessageDto,
  ): Promise<CannedMessageDocument> {
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);

    // Validate department IDs if provided
    if (createDto.departmentIds && createDto.departmentIds.length > 0) {
      const departments = await this.departmentsService.findByIds(
        createDto.departmentIds.map((id) => new Types.ObjectId(id)),
      );
      if (departments.length !== createDto.departmentIds.length) {
        throw new BadRequestException(
          'One or more department IDs are invalid.',
        );
      }
    }

    const cannedMessage = new this.cannedMessageModel({
      title: createDto.title,
      content: createDto.content,
      agentId: agentProfile.userId,
      adminId: agentProfile.adminId,
      isGlobal: createDto.isGlobal || false,
      departmentIds:
        createDto.departmentIds?.map((id) => new Types.ObjectId(id)) || [],
      tags: createDto.tags || [],
    });

    let savedMessage;
    try {
      savedMessage = await cannedMessage.save();
    } catch (error) {
      if (
        error.code === 11000 &&
        (error.keyPattern?.title || error.keyPattern?.adminId)
      ) {
        throw new BadRequestException(
          `A canned message with the title "${createDto.title}" already exists for this admin. Please choose a different title.`,
        );
      }
      throw error;
    }
    this.logger.log(
      `Created canned message ${savedMessage._id} by agent ${agentUserId}`,
    );

    // Populate the agentId and departmentIds before returning
    const populatedMessage = await this.cannedMessageModel
      .findById(savedMessage._id)
      .populate('agentId', 'firstName lastName email')
      .populate('departmentIds', 'name')
      .exec();

    if (!populatedMessage) {
      throw new NotFoundException(
        `Failed to retrieve created canned message ${savedMessage._id}`,
      );
    }

    return populatedMessage;
  }

  /**
   * Bulk upload canned messages from CSV file
   */
  async bulkUploadCannedMessages(
    agentUserId: string,
    filePath: string,
  ): Promise<BulkUploadCannedMessagesResponseDto> {
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);
    
    let csvData: any[];
    try {
      // Read and parse CSV file
      const fileContent = readFileSync(filePath, 'utf-8');
      csvData = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow flexible column count
        quote: '"', // Handle quoted fields properly
        escape: '"', // Handle escaped quotes
      });
    } catch (error) {
      this.logger.error(`Failed to parse CSV file: ${error.message}`);
      throw new BadRequestException('Invalid CSV file format');
    }

    if (!csvData || csvData.length === 0) {
      throw new BadRequestException('CSV file is empty or has no valid data');
    }

    const result: BulkUploadCannedMessagesResponseDto = {
      totalProcessed: csvData.length,
      successCount: 0,
      failureCount: 0,
      errors: [],
      createdMessageIds: [],
    };

    const failedRowNumbers: number[] = [];

    // Process each row
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because CSV is 1-indexed and we skip header

      try {
        // Map CSV fields to canned message fields
        const title = row.shortCode || row.title;
        const content = row.message || row.content;

        // Validate required fields
        if (!title || !content) {
          result.errors.push(
            `Row ${rowNumber}: Title (shortCode) and content (message) are required`,
          );
          result.failureCount++;
          failedRowNumbers.push(rowNumber);
          continue;
        }

        // Clean up content - remove unwanted newlines and normalize whitespace
        const cleanedContent = cleanCsvContent(content);

        // Create canned message
        const cannedMessage = new this.cannedMessageModel({
          title: title.trim(),
          content: cleanedContent,
          agentId: agentProfile.userId,
          adminId: agentProfile.adminId,
          isGlobal: true, // Set to true for bulk upload as requested
          departmentIds: [], // Keep empty as requested
          tags: [], // Keep empty as requested
        });

        const savedMessage = await cannedMessage.save();
        result.createdMessageIds.push((savedMessage._id as Types.ObjectId).toString());
        result.successCount++;

        this.logger.log(
          `Bulk upload: Created canned message ${savedMessage._id} from row ${rowNumber}`,
        );
      } catch (error) {
        let errorMessage = `Row ${rowNumber}: `;
        
        if (error.code === 11000 && error.keyPattern?.title) {
          errorMessage += `A canned message with the title "${row.shortCode || row.title}" already exists for this admin.`;
        } else {
          errorMessage += error.message || 'Unknown error occurred';
        }
        
        result.errors.push(errorMessage);
        result.failureCount++;
        failedRowNumbers.push(rowNumber);
        
        this.logger.error(
          `Bulk upload failed for row ${rowNumber}: ${error.message}`,
        );
      }
    }

    // Generate failed results CSV if there are any failures
    if (result.failureCount > 0) {
      try {
        const failedCsvContent = generateFailedResultsCsv(
          csvData,
          failedRowNumbers,
          result.errors,
        );
        
        result.failedResultsDownloadUrl = saveFailedResultsCsv(
          failedCsvContent,
          agentUserId,
        );
        
        this.logger.log(
          `Generated failed results CSV with ${result.failureCount} failed entries`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to generate failed results CSV: ${error.message}`,
        );
      }
    }

    // Clean up the uploaded file
    try {
      unlinkSync(filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete uploaded file ${filePath}: ${error.message}`);
    }

    this.logger.log(
      `Bulk upload completed: ${result.successCount} successful, ${result.failureCount} failed out of ${result.totalProcessed} total`,
    );

    return result;
  }

  /**
   * Get canned messages with pagination and filtering
   */
  async getCannedMessages(
    agentUserId: string,
    queryDto: GetCannedMessagesDto,
  ): Promise<{
    items: CannedMessageDocument[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    this.logger.debug(
      `Getting canned messages for agent ${agentUserId} with query: ${JSON.stringify(queryDto)}`,
    );
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);

    const {
      search,
      tags,
      departmentIds,
      isGlobal,
      myMessages,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    // Build query
    const query: any = {};

    // Visibility logic: own messages + global messages from same admin
    if (myMessages) {
      // Only show user's own messages
      query.agentId = agentProfile.userId;
    } else {
      // Show own messages + global messages from same admin
      query.$or = [
        { agentId: agentProfile.userId }, // Own messages
        {
          adminId: agentProfile.adminId,
          isGlobal: true,
        }, // Global messages from same admin
      ];
    }

    // Apply filters
    if (isGlobal !== undefined) {
      query.isGlobal = isGlobal;
    }

    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }

    if (departmentIds && departmentIds.length > 0) {
      query.departmentIds = {
        $in: departmentIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (search) {
      // Escape special regex characters to prevent regex injection
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.title = { $regex: escapedSearch, $options: 'i' };
      this.logger.debug(
        `Search query applied: ${JSON.stringify({ title: { $regex: escapedSearch, $options: 'i' } })}`,
      );
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    this.logger.debug(
      `Final query for canned messages: ${JSON.stringify(query)}`,
    );
    this.logger.debug(
      `Sort: ${JSON.stringify(sort)}, Skip: ${skip}, Limit: ${limit}`,
    );

    // Execute queries
    const [items, total] = await Promise.all([
      this.cannedMessageModel
        .find(query)
        .populate('agentId', 'firstName lastName email')
        .populate('departmentIds', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.cannedMessageModel.countDocuments(query).exec(),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    this.logger.debug(
      `Retrieved ${items.length} canned messages for agent ${agentUserId} (page ${page}/${totalPages}), total found: ${total}`,
    );

    if (search) {
      this.logger.debug(
        `Search term "${search}" returned ${items.length} results`,
      );
      items.forEach((msg, index) => {
        this.logger.debug(`Result ${index + 1}: title="${msg.title}"`);
      });
    }

    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      items,
      meta,
    };
  }

  /**
   * Get a specific canned message by ID
   */
  async getCannedMessageById(
    agentUserId: string,
    messageId: string,
  ): Promise<CannedMessageDocument> {
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);

    const cannedMessage = await this.cannedMessageModel
      .findById(messageId)
      .populate('agentId', 'firstName lastName email')
      .populate('departmentIds', 'name')
      .exec();

    if (!cannedMessage) {
      throw new NotFoundException(
        `Canned message with ID ${messageId} not found.`,
      );
    }

    // Check if agent has access to this message
    const hasAccess =
      cannedMessage.agentId.toString() === agentProfile.userId.toString() || // Own message
      (cannedMessage.isGlobal &&
        cannedMessage.adminId.toString() === agentProfile.adminId.toString()); // Global message from same admin

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this canned message.',
      );
    }

    return cannedMessage;
  }

  /**
   * Update a canned message
   */
  async updateCannedMessage(
    agentUserId: string,
    messageId: string,
    updateDto: UpdateCannedMessageDto,
  ): Promise<CannedMessageDocument> {
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);

    const cannedMessage = await this.cannedMessageModel
      .findById(messageId)
      .exec();

    if (!cannedMessage) {
      throw new NotFoundException(
        `Canned message with ID ${messageId} not found.`,
      );
    }

    // Only the creator can update the message
    if (cannedMessage.agentId.toString() !== agentProfile.userId.toString()) {
      throw new ForbiddenException(
        'You can only update your own canned messages.',
      );
    }

    // Validate department IDs if provided
    if (updateDto.departmentIds && updateDto.departmentIds.length > 0) {
      const departments = await this.departmentsService.findByIds(
        updateDto.departmentIds.map((id) => new Types.ObjectId(id)),
      );
      if (departments.length !== updateDto.departmentIds.length) {
        throw new BadRequestException(
          'One or more department IDs are invalid.',
        );
      }
    }

    // Update fields
    if (updateDto.title !== undefined) cannedMessage.title = updateDto.title;
    if (updateDto.content !== undefined)
      cannedMessage.content = updateDto.content;
    if (updateDto.isGlobal !== undefined)
      cannedMessage.isGlobal = updateDto.isGlobal;
    if (updateDto.tags !== undefined) cannedMessage.tags = updateDto.tags;
    if (updateDto.departmentIds !== undefined) {
      cannedMessage.departmentIds = updateDto.departmentIds.map(
        (id) => new Types.ObjectId(id),
      );
    }

    let updatedMessage;
    try {
      updatedMessage = await cannedMessage.save();
    } catch (error) {
      if (
        error.code === 11000 &&
        (error.keyPattern?.title || error.keyPattern?.adminId)
      ) {
        throw new BadRequestException(
          `A canned message with the title "${updateDto.title}" already exists for this admin. Please choose a different title.`,
        );
      }
      throw error;
    }
    this.logger.log(
      `Updated canned message ${messageId} by agent ${agentUserId}`,
    );

    // Populate the agentId and departmentIds before returning
    const populatedMessage = await this.cannedMessageModel
      .findById(updatedMessage._id)
      .populate('agentId', 'firstName lastName email')
      .populate('departmentIds', 'name')
      .exec();

    if (!populatedMessage) {
      throw new NotFoundException(
        `Failed to retrieve updated canned message ${updatedMessage._id}`,
      );
    }

    return populatedMessage;
  }

  /**
   * Delete a canned message
   */
  async deleteCannedMessage(
    agentUserId: string,
    messageId: string,
  ): Promise<void> {
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);

    const cannedMessage = await this.cannedMessageModel
      .findById(messageId)
      .exec();

    if (!cannedMessage) {
      throw new NotFoundException(
        `Canned message with ID ${messageId} not found.`,
      );
    }

    // Only the creator can delete the message
    if (cannedMessage.agentId.toString() !== agentProfile.userId.toString()) {
      throw new ForbiddenException(
        'You can only delete your own canned messages.',
      );
    }

    await this.cannedMessageModel.findByIdAndDelete(messageId).exec();
    this.logger.log(
      `Deleted canned message ${messageId} by agent ${agentUserId}`,
    );
  }

  /**
   * Get all online agents
   */
  async getAllOnlineAgents(): Promise<AgentProfileDocument[]> {
    return this.agentProfileModel
      .find({
        isOnline: true,
        isBlocked: { $ne: true }, // Exclude blocked agents
      })
      .populate('departmentIds')
      .exec();
  }

  /**
   * Block or unblock an agent account
   */
  async blockUnblockAgent(
    agentId: string,
    isBlocked: boolean,
    adminUserId: string,
  ): Promise<AgentProfileDocument> {
    this.logger.log(
      `${isBlocked ? 'Blocking' : 'Unblocking'} agent ${agentId} by admin ${adminUserId}`,
    );

    const agentProfile = await this.findAgentProfileById(agentId);
    if (!agentProfile) {
      throw new NotFoundException(`Agent profile with ID ${agentId} not found`);
    }

    // Prevent admin from blocking themselves
    if (agentProfile.userId.toString() === adminUserId) {
      throw new BadRequestException(
        'You cannot block/unblock your own account',
      );
    }

    // Check if the current admin is the one who created this agent profile
    if (
      agentProfile.adminId &&
      agentProfile.adminId.toString() !== adminUserId
    ) {
      this.logger.warn(
        `Admin ${adminUserId} attempted to ${isBlocked ? 'block' : 'unblock'} agent ${agentId} created by admin ${agentProfile.adminId}`,
      );
      throw new BadRequestException(
        'You can only block/unblock agent profiles that you created',
      );
    }

    // Update the blocked status
    agentProfile.isBlocked = isBlocked;

    // If blocking the agent, also set them offline
    if (isBlocked) {
      agentProfile.isOnline = false;
      agentProfile.lastSeen = new Date();
    }

    const updatedProfile = await agentProfile.save();

    this.logger.log(
      `Agent ${agentId} has been ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
    );

    return updatedProfile;
  }
}
