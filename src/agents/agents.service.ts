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
import {
  ChatSession,
  ChatSessionDocument,
} from 'src/schemas/chat-session.schema';
import {
  ChatMessage,
  ChatMessageDocument,
} from 'src/schemas/chat-message.schema';
import {
  Appointment,
  AppointmentDocument,
} from 'src/schemas/appointment.schema';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { CreateCannedMessageDto } from './dto/create-canned-message.dto';
import { UpdateCannedMessageDto } from './dto/update-canned-message.dto';
import { GetCannedMessagesDto } from './dto/get-canned-messages.dto';
import { GetAgentsDto } from './dto/get-agents.dto';
import { GetAgentMetricsDto, TimeFilter } from './dto/get-agent-metrics.dto';
import { AgentMetricItemDto } from './dto/agent-metrics-response.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../shared/constants/enums';
import { DepartmentsService } from 'src/departments/departments.service';
import { ChatSessionService } from 'src/chat/services/chat-session/chat-session.service';
import { WidgetsService } from 'src/widgets/widgets.service';
import { CustomersService } from 'src/customers/customers.service';
import { ShiftService } from '../shared/services/shift.service';
const { parse } = require('csv-parse/sync');
import { readFileSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as XLSX from 'xlsx';
import { BulkUploadCannedMessagesResponseDto } from './dto/bulk-upload-canned-messages.dto';
import {
  ExportCannedMessagesDto,
  ExportCannedMessagesResponseDto,
} from './dto/export-canned-messages.dto';
import { ImportCannedMessagesResponseDto } from './dto/import-canned-messages.dto';
import {
  generateFailedResultsCsv,
  saveFailedResultsCsv,
  cleanCsvContent,
} from '../shared/utils/file-upload.utils';
import { RedisService } from '../shared/redis/redis.service';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  constructor(
    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,
    @InjectModel(CannedMessage.name)
    private cannedMessageModel: Model<CannedMessageDocument>,
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
    @InjectModel(Appointment.name)
    private appointmentModel: Model<AppointmentDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly departmentsService: DepartmentsService,
    @Inject(forwardRef(() => ChatSessionService))
    private readonly chatSessionService: ChatSessionService,
    private readonly widgetsService: WidgetsService,
    @Inject(forwardRef(() => CustomersService))
    private readonly customersService: CustomersService,
    private readonly shiftService: ShiftService,
    private readonly redisService: RedisService,
  ) {}

  async createAgentProfile(
    userId: Types.ObjectId,
    adminId?: Types.ObjectId, // should be optional ?
    initialProfileData: Partial<AgentProfile> = {},
  ): Promise<AgentProfileDocument> {
    const user = await this.usersService.findById(userId);
    if (
      !user ||
      (user.role !== UserRole.AGENT &&
        user.role !== UserRole.ADMIN &&
        user.role !== UserRole.MANAGER)
    ) {
      throw new BadRequestException(
        'User is not an Agent/Admin/Manager or does not exist.',
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

  /**
   * Get all agent profiles (for migration/admin purposes)
   * @returns Promise<AgentProfileDocument[]> - All agent profiles
   */
  async getAllAgentProfiles(): Promise<AgentProfileDocument[]> {
    this.logger.log('Getting all agent profiles');
    return this.agentProfileModel.find().exec();
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

  /**
   * Get agents with pagination and filtering
   */
  async getAgentsWithPagination(
    adminId: string | Types.ObjectId,
    queryDto: GetAgentsDto,
  ): Promise<{
    items: any[];
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
      `Getting agents with pagination for admin ${adminId} with query: ${JSON.stringify(queryDto)}`,
    );

    // if adminId is not ObjectId, convert it to ObjectId
    if (typeof adminId === 'string') adminId = new Types.ObjectId(adminId);

    const {
      search,
      departmentIds,
      isOnline,
      isBlocked,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    // Build query for agent profiles
    const query: any = { adminId };

    // Apply filters
    if (isOnline !== undefined) {
      query.isOnline = isOnline;
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked;
    }

    if (departmentIds && departmentIds.length > 0) {
      query.departmentIds = {
        $in: departmentIds.map((id) => new Types.ObjectId(id)),
      };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object with stable sorting (_id as secondary sort)
    const sort: any = {};
    if (['firstName', 'lastName', 'email'].includes(sortBy)) {
      // For user fields, we'll sort after joining
      sort['createdAt'] = sortOrder === 'asc' ? 1 : -1; // Default sort for now
      sort['_id'] = 1; // Secondary sort for stable pagination
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      sort['_id'] = 1; // Secondary sort for stable pagination
    }

    this.logger.debug(`Final query for agents: ${JSON.stringify(query)}`);
    this.logger.debug(
      `Sort: ${JSON.stringify(sort)}, Skip: ${skip}, Limit: ${limit}`,
    );

    // For search functionality, we need to get all matching records first
    // then apply pagination, since search is on user fields
    if (search) {
      // Get all agent profiles matching the query (without pagination)
      const allAgentProfiles = await this.agentProfileModel
        .find(query)
        .populate('departmentIds', 'name')
        .lean()
        .exec();

      // Get user details for all agent profiles
      const allUserIds = allAgentProfiles.map((profile) => profile.userId);
      const allUsers = await this.usersService.findManyByIds(allUserIds);
      const allUserMap = new Map(
        allUsers.map((user) => [user._id.toString(), user]),
      );

      // Combine and filter by search
      const escapedSearch = search.toLowerCase();
      let filteredItems = allAgentProfiles
        .map((profile) => {
          const userDetails = allUserMap.get(profile.userId.toString());
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
              : null,
          };
        })
        .filter((item) => {
          if (!item.user) return false;
          const fullName =
            `${item.user.firstName} ${item.user.lastName}`.toLowerCase();
          const email = item.user.email.toLowerCase();
          return (
            fullName.includes(escapedSearch) || email.includes(escapedSearch)
          );
        });

      // Apply sorting for user fields
      if (['firstName', 'lastName', 'email'].includes(sortBy)) {
        filteredItems.sort((a, b) => {
          const aValue = a.user?.[sortBy]?.toLowerCase() || '';
          const bValue = b.user?.[sortBy]?.toLowerCase() || '';

          // Primary sort by the user field
          let comparison = 0;
          if (sortOrder === 'asc') {
            comparison = aValue.localeCompare(bValue);
          } else {
            comparison = bValue.localeCompare(aValue);
          }

          // Secondary sort by _id for stable pagination (always ascending)
          if (comparison === 0) {
            const aId = a._id.toString();
            const bId = b._id.toString();
            return aId.localeCompare(bId);
          }

          return comparison;
        });
      } else {
        // Sort by agent profile fields
        filteredItems.sort((a, b) => {
          const aValue = a[sortBy];
          const bValue = b[sortBy];

          // Primary sort by the agent profile field
          let comparison = 0;
          if (sortOrder === 'asc') {
            comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          } else {
            comparison = aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
          }

          // Secondary sort by _id for stable pagination (always ascending)
          if (comparison === 0) {
            const aId = a._id.toString();
            const bId = b._id.toString();
            return aId.localeCompare(bId);
          }

          return comparison;
        });
      }

      // Apply pagination to filtered results
      const total = filteredItems.length;
      const items = filteredItems.slice(skip, skip + limit);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrev = page > 1;

      this.logger.debug(
        `Retrieved ${items.length} agents for admin ${adminId} (page ${page}/${totalPages}), total found: ${total}`,
      );

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
    } else {
      // No search - check if we need to sort by user fields
      if (['firstName', 'lastName', 'email'].includes(sortBy)) {
        // Use MongoDB aggregation pipeline for efficient join, sort, and pagination
        // This approach is more efficient than fetching all records into memory
        const pipeline: any[] = [
          // Match agent profiles by adminId and filters
          { $match: query },

          // Lookup user details
          {
            $lookup: {
              from: 'users', // collection name in MongoDB
              localField: 'userId',
              foreignField: '_id',
              as: 'userDetails',
            },
          },

          // Unwind user details (convert array to object)
          {
            $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true },
          },

          // Add computed field for case-insensitive sorting
          {
            $addFields: {
              sortField: {
                $toLower: `$userDetails.${sortBy}`,
              },
            },
          },

          // Sort by the user field with _id as secondary sort for stable pagination
          { $sort: { sortField: sortOrder === 'asc' ? 1 : -1, _id: 1 } },

          // Facet for pagination and total count
          {
            $facet: {
              metadata: [{ $count: 'total' }],
              data: [{ $skip: skip }, { $limit: limit }],
            },
          },
        ];

        const result = await this.agentProfileModel.aggregate(pipeline).exec();

        const total = result[0]?.metadata[0]?.total || 0;
        const agentProfiles = result[0]?.data || [];

        // Populate departments separately (aggregation doesn't auto-populate)
        const departmentIds = new Set<string>();
        agentProfiles.forEach((profile) => {
          if (profile.departmentIds && Array.isArray(profile.departmentIds)) {
            profile.departmentIds.forEach((id) =>
              departmentIds.add(id.toString()),
            );
          }
        });

        let departmentMap = new Map();
        if (departmentIds.size > 0) {
          const departments = await this.departmentsService.findByIds(
            Array.from(departmentIds).map((id) => new Types.ObjectId(id)),
          );
          departmentMap = new Map(
            departments.map((dept) => [dept._id.toString(), dept]),
          );
        }

        // Format the response
        const items = agentProfiles.map((profile) => {
          const populatedDepartments = profile.departmentIds
            ? profile.departmentIds
                .map((id) => departmentMap.get(id.toString()))
                .filter(Boolean)
                .map((dept) => ({ _id: dept._id, name: dept.name }))
            : [];

          return {
            ...profile,
            departmentIds: populatedDepartments,
            user: profile.userDetails
              ? {
                  _id: profile.userDetails._id,
                  firstName: profile.userDetails.firstName,
                  lastName: profile.userDetails.lastName,
                  email: profile.userDetails.email,
                  role: profile.userDetails.role,
                  isEmailVerified: profile.userDetails.isEmailVerified,
                }
              : null,
            userDetails: undefined, // Remove temporary field
            sortField: undefined, // Remove temporary field
          };
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        this.logger.debug(
          `Retrieved ${items.length} agents for admin ${adminId} (page ${page}/${totalPages}), total found: ${total}`,
        );

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
      } else {
        // For agent profile field sorting, use standard database pagination
        const [agentProfiles, total] = await Promise.all([
          this.agentProfileModel
            .find(query)
            .populate('departmentIds', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),
          this.agentProfileModel.countDocuments(query).exec(),
        ]);

        // Get user details for the agent profiles
        const userIds = agentProfiles.map((profile) => profile.userId);
        const users = await this.usersService.findManyByIds(userIds);
        const userMap = new Map(
          users.map((user) => [user._id.toString(), user]),
        );

        // Combine agent profiles with user details
        const items = agentProfiles.map((profile) => {
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
              : null,
          };
        });

        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        this.logger.debug(
          `Retrieved ${items.length} agents for admin ${adminId} (page ${page}/${totalPages}), total found: ${total}`,
        );

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
    }
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

    // Find all potentially online agents from the same organization as the widget
    // We'll check effective online status (including grace period) for each agent
    const potentialAgents = await this.agentProfileModel
      .find({
        isBlocked: { $ne: true }, // Exclude blocked agents
        adminId: widget.createdBy, // CRITICAL: Only agents from the same organization
      })
      .exec();

    // Filter agents by effective online status (considering grace period)
    const onlineAgents: AgentProfileDocument[] = [];
    for (const agent of potentialAgents) {
      const isEffectivelyOnline = await this.isAgentEffectivelyOnline(
        agent.userId.toString(),
      );
      if (isEffectivelyOnline) {
        onlineAgents.push(agent);
      }
    }

    this.logger.debug(
      `Found ${onlineAgents.length} effectively online agents from organization ${widget.createdBy} for widget ${widgetId}`,
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

    // Use effective online status (considering grace period)
    const isEffectivelyOnline = await this.isAgentEffectivelyOnline(agentId);

    return {
      isAvailable: isEffectivelyOnline && isWithinShift,
      isWithinShift,
      isOnline: isEffectivelyOnline,
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
        result.createdMessageIds.push(
          (savedMessage._id as Types.ObjectId).toString(),
        );
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
      this.logger.warn(
        `Failed to delete uploaded file ${filePath}: ${error.message}`,
      );
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
    // if (cannedMessage.agentId.toString() !== agentProfile.userId.toString()) {
    //   throw new ForbiddenException(
    //     'You can only update your own canned messages.',
    //   );
    // }

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
    // if (cannedMessage.agentId.toString() !== agentProfile.userId.toString()) {
    //   throw new ForbiddenException(
    //     'You can only delete your own canned messages.',
    //   );
    // }

    await this.cannedMessageModel.findByIdAndDelete(messageId).exec();
    this.logger.log(
      `Deleted canned message ${messageId} by agent ${agentUserId}`,
    );
  }

  /**
   * Bulk delete canned messages
   */
  async bulkDeleteCannedMessages(
    agentUserId: string,
    messageIds: string[],
  ): Promise<{
    totalProcessed: number;
    successCount: number;
    failureCount: number;
    errors: string[];
    deletedMessageIds: string[];
    failedMessageIds: string[];
  }> {
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);

    const results = {
      totalProcessed: messageIds.length,
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
      deletedMessageIds: [] as string[],
      failedMessageIds: [] as string[],
    };

    // Process each message ID
    for (const messageId of messageIds) {
      try {
        // Validate MongoDB ObjectId format
        if (!Types.ObjectId.isValid(messageId)) {
          results.failureCount++;
          results.errors.push(`Invalid message ID format: ${messageId}`);
          results.failedMessageIds.push(messageId);
          continue;
        }

        const cannedMessage = await this.cannedMessageModel
          .findById(messageId)
          .exec();

        if (!cannedMessage) {
          results.failureCount++;
          results.errors.push(`Message ID ${messageId} not found`);
          results.failedMessageIds.push(messageId);
          continue;
        }

        // Check if the agent has permission to delete this message
        // Allow deletion if the message belongs to the same admin
        if (
          cannedMessage.adminId.toString() !== agentProfile.adminId.toString()
        ) {
          results.failureCount++;
          results.errors.push(
            `Message ID ${messageId} is not accessible by this agent`,
          );
          results.failedMessageIds.push(messageId);
          continue;
        }

        await this.cannedMessageModel.findByIdAndDelete(messageId).exec();
        results.successCount++;
        results.deletedMessageIds.push(messageId);

        this.logger.log(
          `Bulk deleted canned message ${messageId} by agent ${agentUserId}`,
        );
      } catch (error) {
        results.failureCount++;
        results.errors.push(
          `Failed to delete message ID ${messageId}: ${error.message}`,
        );
        results.failedMessageIds.push(messageId);
        this.logger.error(
          `Failed to bulk delete canned message ${messageId} by agent ${agentUserId}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Bulk delete completed by agent ${agentUserId}: ${results.successCount} successful, ${results.failureCount} failed`,
    );

    return results;
  }

  /**
   * Get all online agents (considering effective online status including grace period)
   */
  async getAllOnlineAgents(): Promise<AgentProfileDocument[]> {
    // Get all non-blocked agents
    const potentialAgents = await this.agentProfileModel
      .find({
        isBlocked: { $ne: true }, // Exclude blocked agents
      })
      .populate('departmentIds')
      .exec();

    // Filter by effective online status
    const onlineAgents: AgentProfileDocument[] = [];
    for (const agent of potentialAgents) {
      const isEffectivelyOnline = await this.isAgentEffectivelyOnline(
        agent.userId.toString(),
      );
      if (isEffectivelyOnline) {
        onlineAgents.push(agent);
      }
    }

    return onlineAgents;
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

  /**
   * Check if an agent is effectively online, considering both DB status and grace period
   * This helps solve race conditions during page refresh where API calls happen before socket reconnection
   */
  async isAgentEffectivelyOnline(agentId: string): Promise<boolean> {
    try {
      // First check the database status
      const agentProfile = await this.findAgentProfileByUserId(agentId);
      if (!agentProfile) {
        return false;
      }

      // If agent is online in DB, they're definitely online
      if (agentProfile.isOnline) {
        return true;
      }

      // If agent is offline in DB, check if they're in grace period
      // During grace period, we consider them still online for API purposes
      const graceStillActive = await this.redisService.get(
        `agent_disconnect_grace:${agentId}`,
      );
      if (graceStillActive === 'true') {
        this.logger.debug(
          `Agent ${agentId} is in grace period, considering them online for API purposes`,
        );
        return true;
      }

      // Agent is offline and not in grace period
      return false;
    } catch (error) {
      this.logger.error(
        `Error checking effective online status for agent ${agentId}: ${error.message}`,
      );
      // In case of error, fall back to DB status only
      const agentProfile = await this.findAgentProfileByUserId(agentId);
      return agentProfile?.isOnline || false;
    }
  }

  /**
   * Get agent metrics with domain-wise breakdown
   */
  async getAgentMetrics(
    agentId: string,
    queryDto: GetAgentMetricsDto,
  ): Promise<{
    items: AgentMetricItemDto[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      timeFilter,
      domain,
      page = 1,
      limit = 10,
      sortBy = 'acceptedChats',
      sortOrder = 'desc',
    } = queryDto;

    this.logger.debug(
      `Getting metrics for agent ${agentId} with filters: ${JSON.stringify(queryDto)}`,
    );

    // Calculate date range based on time filter
    const dateRange = this.getDateRangeForTimeFilter(timeFilter);

    // Build aggregation pipeline
    const pipeline = this.buildMetricsAggregationPipeline(
      agentId,
      dateRange,
      domain,
      sortBy,
      sortOrder,
      page,
      limit,
    );

    // Execute aggregation
    const [result] = await this.chatSessionModel.aggregate(pipeline).exec();

    if (!result) {
      return {
        items: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const { data, totalCount } = result;
    const items = data || [];
    const total = totalCount?.[0]?.count || 0;

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    this.logger.debug(
      `Retrieved ${items.length} metric items for agent ${agentId} (page ${page}/${totalPages}), total found: ${total}`,
    );

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
   * Get date range based on time filter
   */
  private getDateRangeForTimeFilter(timeFilter: TimeFilter): {
    start: Date;
    end: Date;
  } {
    const now = new Date();
    const start = new Date();
    const end = new Date(now);

    switch (timeFilter) {
      case TimeFilter.TODAY:
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case TimeFilter.LAST_WEEK:
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case TimeFilter.LAST_MONTH:
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
    }

    return { start, end };
  }

  /**
   * Build MongoDB aggregation pipeline for metrics calculation
   */
  private buildMetricsAggregationPipeline(
    agentId: string,
    dateRange: { start: Date; end: Date },
    domain?: string,
    sortBy: string = 'acceptedChats',
    sortOrder: string = 'desc',
    page: number = 1,
    limit: number = 10,
  ): any[] {
    const agentObjectId = new Types.ObjectId(agentId);

    // Base match conditions
    const matchConditions: any = {
      $and: [
        {
          $or: [
            { agentId: agentObjectId }, // Current agent
            { 'agentHistory.agentId': agentObjectId }, // Agent in history
          ],
        },
        {
          $or: [
            { acceptedAt: { $gte: dateRange.start, $lte: dateRange.end } },
            { initiatedAt: { $gte: dateRange.start, $lte: dateRange.end } },
          ],
        },
      ],
    };

    // Add domain filter if specified
    if (domain) {
      matchConditions.domain = domain;
    }

    const pipeline = [
      // Match chat sessions for the agent within date range
      { $match: matchConditions },

      // Group by domain to calculate metrics
      {
        $group: {
          _id: '$domain',
          acceptedChats: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$acceptedAt', null] },
                    {
                      $or: [
                        { $eq: ['$agentId', agentObjectId] },
                        {
                          $in: [
                            agentObjectId,
                            {
                              $map: {
                                input: {
                                  $filter: {
                                    input: '$agentHistory',
                                    cond: { $eq: ['$$this.isActive', true] },
                                  },
                                },
                                as: 'agent',
                                in: '$$agent.agentId',
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          totalSessions: { $sum: 1 },
          sessionIds: { $push: '$_id' },
        },
      },

      // Lookup chat messages to calculate response metrics
      {
        $lookup: {
          from: 'chatmessages',
          let: { sessionIds: '$sessionIds', agentId: agentObjectId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$chatSessionId', '$$sessionIds'] },
                    { $eq: ['$senderId', '$$agentId'] },
                    { $eq: ['$senderType', 'AGENT'] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$chatSessionId',
                firstAgentMessage: { $min: '$timestamp' },
                messageCount: { $sum: 1 },
              },
            },
          ],
          as: 'agentMessages',
        },
      },

      // Lookup customer messages for response time calculation
      {
        $lookup: {
          from: 'chatmessages',
          let: { sessionIds: '$sessionIds' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$chatSessionId', '$$sessionIds'] },
                    { $eq: ['$senderType', 'CUSTOMER'] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: '$chatSessionId',
                firstCustomerMessage: { $min: '$timestamp' },
              },
            },
          ],
          as: 'customerMessages',
        },
      },

      // Lookup sessions to check for proactive chats
      {
        $lookup: {
          from: 'chatmessages',
          let: { sessionIds: '$sessionIds', agentId: agentObjectId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$chatSessionId', '$$sessionIds'],
                },
              },
            },
            {
              $sort: { timestamp: 1 },
            },
            {
              $group: {
                _id: '$chatSessionId',
                firstMessage: { $first: '$$ROOT' },
              },
            },
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$firstMessage.senderId', agentObjectId] },
                    { $eq: ['$firstMessage.senderType', 'AGENT'] },
                  ],
                },
              },
            },
          ],
          as: 'proactiveSessions',
        },
      },

      // Lookup appointments for the chat sessions
      {
        $lookup: {
          from: 'appointments',
          let: { sessionIds: '$sessionIds', agentId: agentObjectId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $in: ['$chatSessionId', '$$sessionIds'] },
                    { $eq: ['$agentId', '$$agentId'] },
                  ],
                },
              },
            },
          ],
          as: 'appointments',
        },
      },

      // Lookup chat sessions again to count missed chats (where agent left due to inactivity)
      {
        $lookup: {
          from: 'chatsessions',
          let: { sessionIds: '$sessionIds', agentId: agentObjectId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$_id', '$$sessionIds'],
                },
              },
            },
            {
              $project: {
                missedByAgent: {
                  $size: {
                    $filter: {
                      input: '$agentHistory',
                      cond: {
                        $and: [
                          { $eq: ['$$this.agentId', agentObjectId] },
                          { $eq: ['$$this.leftReason', 'inactivity'] },
                        ],
                      },
                    },
                  },
                },
              },
            },
            {
              $match: {
                missedByAgent: { $gt: 0 },
              },
            },
          ],
          as: 'missedSessions',
        },
      },

      // Calculate final metrics
      {
        $project: {
          domain: '$_id',
          acceptedChats: 1,
          respondedChats: { $size: '$agentMessages' },
          proactiveChats: { $size: '$proactiveSessions' },
          totalBookings: { $size: '$appointments' },
          missedChats: { $size: '$missedSessions' },
          avgResponseTimeMs: {
            $cond: [
              { $gt: [{ $size: '$agentMessages' }, 0] },
              {
                $avg: {
                  $map: {
                    input: '$agentMessages',
                    as: 'agentMsg',
                    in: {
                      $let: {
                        vars: {
                          customerMsg: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$customerMessages',
                                  cond: {
                                    $eq: ['$$this._id', '$$agentMsg._id'],
                                  },
                                },
                              },
                              0,
                            ],
                          },
                        },
                        in: {
                          $cond: [
                            { $ne: ['$$customerMsg', null] },
                            {
                              $subtract: [
                                '$$agentMsg.firstAgentMessage',
                                '$$customerMsg.firstCustomerMessage',
                              ],
                            },
                            0,
                          ],
                        },
                      },
                    },
                  },
                },
              },
              0,
            ],
          },
        },
      },

      // Convert avgResponseTimeMs to formatted string
      {
        $addFields: {
          avgResponseTime: {
            $let: {
              vars: {
                // Ensure totalSeconds is never negative
                totalSeconds: {
                  $max: [0, { $divide: ['$avgResponseTimeMs', 1000] }],
                },
              },
              in: {
                $let: {
                  vars: {
                    hours: {
                      $floor: { $divide: ['$$totalSeconds', 3600] },
                    },
                    minutes: {
                      $floor: {
                        $divide: [{ $mod: ['$$totalSeconds', 3600] }, 60],
                      },
                    },
                    seconds: {
                      $floor: { $mod: ['$$totalSeconds', 60] },
                    },
                  },
                  in: {
                    $concat: [
                      { $toString: '$$hours' },
                      ':',
                      {
                        $cond: [
                          { $lt: ['$$minutes', 10] },
                          { $concat: ['0', { $toString: '$$minutes' }] },
                          { $toString: '$$minutes' },
                        ],
                      },
                      ':',
                      {
                        $cond: [
                          { $lt: ['$$seconds', 10] },
                          { $concat: ['0', { $toString: '$$seconds' }] },
                          { $toString: '$$seconds' },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },

      // Remove the avgResponseTimeMs field
      {
        $project: {
          avgResponseTimeMs: 0,
        },
      },

      // Facet for pagination and total count
      {
        $facet: {
          data: [
            // Sort
            {
              $sort: {
                [sortBy]: sortOrder === 'asc' ? 1 : -1,
              },
            },
            // Pagination
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    return pipeline;
  }

  // ==================== EXPORT/IMPORT CANNED MESSAGES METHODS ====================

  /**
   * Export canned messages to Excel file
   */
  async exportCannedMessages(
    agentUserId: string,
    exportDto: ExportCannedMessagesDto,
  ): Promise<ExportCannedMessagesResponseDto> {
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);

    // Build query based on filters
    const query: any = {
      adminId: agentProfile.adminId,
    };

    // Apply filters
    if (exportDto.departmentIds) {
      const departmentIds = exportDto.departmentIds
        .split(',')
        .map((id) => new Types.ObjectId(id.trim()));
      query.departmentIds = { $in: departmentIds };
    }

    if (exportDto.isGlobal !== undefined) {
      query.isGlobal = exportDto.isGlobal;
    }

    if (exportDto.search) {
      query.$or = [
        { title: { $regex: exportDto.search, $options: 'i' } },
        { content: { $regex: exportDto.search, $options: 'i' } },
      ];
    }

    if (exportDto.tags) {
      const tags = exportDto.tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase());
      query.tags = { $in: tags };
    }

    // Get all canned messages matching the query
    const cannedMessages = await this.cannedMessageModel
      .find(query)
      .select('title content')
      .sort({ createdAt: -1 })
      .lean();

    if (cannedMessages.length === 0) {
      throw new BadRequestException(
        'No canned messages found matching the specified criteria',
      );
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data for Excel
    const excelData = cannedMessages.map((message, index) => ({
      'Row Number': index + 1,
      Title: message.title,
      Content: message.content,
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Row Number
      { wch: 30 }, // Title
      { wch: 50 }, // Content
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Canned Messages');

    // Generate filename with timestamp
    const timestamp = Date.now();
    const filename = `canned-messages-export-${timestamp}.xlsx`;
    const filepath = join(process.cwd(), 'uploads', 'exports', filename);

    // Ensure exports directory exists
    const fs = require('fs');
    const exportsDir = join(process.cwd(), 'uploads', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Write Excel file
    XLSX.writeFile(workbook, filepath);

    this.logger.log(
      `Exported ${cannedMessages.length} canned messages to ${filename} by user ${agentUserId}`,
    );

    return {
      downloadUrl: `/uploads/exports/${filename}`,
      totalExported: cannedMessages.length,
      exportedAt: new Date().toISOString(),
      filename,
    };
  }

  /**
   * Import canned messages from Excel file
   */
  async importCannedMessages(
    agentUserId: string,
    filePath: string,
  ): Promise<ImportCannedMessagesResponseDto> {
    const agentProfile = await this.findAgentProfileByUserIdOrFail(agentUserId);

    let excelData: any[];
    try {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Remove header row and filter out empty rows
      excelData = excelData
        .slice(1)
        .filter(
          (row: any) => row && row.length > 0 && (row[0] || row[1] || row[2]),
        );
    } catch (error) {
      this.logger.error(`Failed to parse Excel file: ${error.message}`);
      throw new BadRequestException('Invalid Excel file format');
    }

    if (!excelData || excelData.length === 0) {
      throw new BadRequestException('Excel file is empty or has no valid data');
    }

    const result: ImportCannedMessagesResponseDto = {
      totalProcessed: excelData.length,
      successCount: 0,
      failureCount: 0,
      errors: [],
      createdMessageIds: [],
      importedAt: new Date().toISOString(),
    };

    const failedRows: any[] = [];

    // Process each row in batches
    const batchSize = 50;
    for (let i = 0; i < excelData.length; i += batchSize) {
      const batch = excelData.slice(i, i + batchSize);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNumber = i + j + 2; // +2 because Excel is 1-indexed and we skip header

        try {
          // Extract data from row (assuming columns: Row Number, Title, Content)
          const title = row[1]?.toString()?.trim();
          const content = row[2]?.toString()?.trim();

          // Validate required fields
          if (!title || !content) {
            result.errors.push(
              `Row ${rowNumber}: Title and content are required`,
            );
            result.failureCount++;
            failedRows.push({
              rowNumber,
              title,
              content,
              error: 'Missing required fields',
            });
            continue;
          }

          // Create canned message
          const cannedMessage = new this.cannedMessageModel({
            title,
            content,
            agentId: agentProfile.userId,
            adminId: agentProfile.adminId,
            isGlobal: true, // Set to true for bulk import
            departmentIds: [], // Keep empty as requested
            tags: [], // Keep empty as requested
          });

          const savedMessage = await cannedMessage.save();
          result.createdMessageIds.push(
            (savedMessage._id as Types.ObjectId).toString(),
          );
          result.successCount++;

          this.logger.log(
            `Import: Created canned message ${savedMessage._id} from row ${rowNumber}`,
          );
        } catch (error) {
          let errorMessage = `Row ${rowNumber}: `;

          if (error.code === 11000 && error.keyPattern?.title) {
            errorMessage += `A canned message with the title "${row[1]}" already exists for this admin.`;
          } else {
            errorMessage += error.message || 'Unknown error occurred';
          }

          result.errors.push(errorMessage);
          result.failureCount++;
          failedRows.push({
            rowNumber,
            title: row[1]?.toString()?.trim(),
            content: row[2]?.toString()?.trim(),
            error: errorMessage,
          });

          this.logger.error(
            `Import failed for row ${rowNumber}: ${error.message}`,
          );
        }
      }
    }

    // Generate failed results Excel file if there are failures
    if (failedRows.length > 0) {
      try {
        const failedWorkbook = XLSX.utils.book_new();
        const failedData = failedRows.map((row) => ({
          'Row Number': row.rowNumber,
          Title: row.title || '',
          Content: row.content || '',
          Error: row.error,
        }));

        const failedWorksheet = XLSX.utils.json_to_sheet(failedData);
        failedWorksheet['!cols'] = [
          { wch: 12 }, // Row Number
          { wch: 30 }, // Title
          { wch: 50 }, // Content
          { wch: 60 }, // Error
        ];

        XLSX.utils.book_append_sheet(
          failedWorkbook,
          failedWorksheet,
          'Failed Results',
        );

        const timestamp = Date.now();
        const failedFilename = `failed-canned-messages-${timestamp}.xlsx`;
        const failedFilepath = join(
          process.cwd(),
          'uploads',
          'failed-results',
          failedFilename,
        );

        // Ensure failed-results directory exists
        const fs = require('fs');
        const failedResultsDir = join(
          process.cwd(),
          'uploads',
          'failed-results',
        );
        if (!fs.existsSync(failedResultsDir)) {
          fs.mkdirSync(failedResultsDir, { recursive: true });
        }

        XLSX.writeFile(failedWorkbook, failedFilepath);
        result.failedResultsDownloadUrl = `/uploads/failed-results/${failedFilename}`;
      } catch (error) {
        this.logger.error(
          `Failed to generate failed results file: ${error.message}`,
        );
      }
    }

    // Clean up uploaded file
    try {
      unlinkSync(filePath);
    } catch (error) {
      this.logger.warn(
        `Failed to delete uploaded file ${filePath}: ${error.message}`,
      );
    }

    this.logger.log(
      `Import completed: ${result.successCount} successful, ${result.failureCount} failed out of ${result.totalProcessed} total`,
    );

    return result;
  }
}
