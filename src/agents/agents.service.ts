import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AgentProfile,
  AgentProfileDocument,
} from 'src/schemas/agent-profile.schema';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../shared/constants/enums';
import { DepartmentsService } from 'src/departments/departments.service';
import { ChatSessionService } from 'src/chat/services/chat-session/chat-session.service';
import { WidgetsService } from 'src/widgets/widgets.service';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  constructor(
    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly departmentsService: DepartmentsService,
    @Inject(forwardRef(() => ChatSessionService))
    private readonly chatSessionService: ChatSessionService,
    private readonly widgetsService: WidgetsService,
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
    return this.agentProfileModel
      .findById(agentId)
      .populate('departmentIds')
      .exec();
  }

  async findAgentProfileByUserId(
    userId: string | Types.ObjectId,
  ): Promise<AgentProfileDocument | null> {
    // handle the string userId as a Types.ObjectId
    let _id: Types.ObjectId;
    if (typeof userId === 'string') _id = new Types.ObjectId(userId);
    else _id = userId;

    return this.agentProfileModel
      .findOne({ userId: _id })
      .populate('departmentIds')
      .exec();
  }

  async findAgentProfileByUserIdOrFail(
    userId: string | Types.ObjectId,
  ): Promise<AgentProfileDocument> {
    const profile = await this.findAgentProfileByUserId(userId);

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
        user: userDetails || null, // Attach user details
      };
    });
  }

  async updateAgentProfileByUserId(
    agentUserId: string,
    updateDto: UpdateAgentProfileDto,
    isAdminUpdate: boolean = false, // to distinguish admin updates from agent's own
  ): Promise<AgentProfileDocument> {
    const agentProfile = await this.agentProfileModel
      .findOne({ userId: agentUserId })
      .exec();
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
    if (typeof updateDto.isOnline === 'boolean') {
      agentProfile.isOnline = updateDto.isOnline;
      if (updateDto.isOnline === false || updateDto.isOnline === true) {
        // only update lastSeen if status actually changes or set
        agentProfile.lastSeen = new Date();
      }
    }
    if (updateDto.maxConcurrentChats)
      agentProfile.maxConcurrentChats = updateDto.maxConcurrentChats;

    return agentProfile.save();
  }

  async updateAgentProfileById(
    agentId: string,
    updateDto: UpdateAgentProfileDto,
    isAdminUpdate: boolean = false, // to distinguish admin updates from agent's own
  ): Promise<AgentProfileDocument> {
    const agentProfile = await this.agentProfileModel.findById(agentId).exec();
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
    if (typeof updateDto.isOnline === 'boolean') {
      agentProfile.isOnline = updateDto.isOnline;
      if (updateDto.isOnline === false || updateDto.isOnline === true) {
        // only update lastSeen if status actually changes or set
        agentProfile.lastSeen = new Date();
      }
    }
    if (updateDto.maxConcurrentChats)
      agentProfile.maxConcurrentChats = updateDto.maxConcurrentChats;

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

    // Find all online agents first
    const onlineAgents = await this.agentProfileModel
      .find({
        isOnline: true, // First check: agent must be online
      })
      .exec();

    this.logger.debug(
      `Found ${onlineAgents.length} online agents for widget ${widgetId} and details are ${onlineAgents}`,
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

    // Further filter by maxConcurrentChats
    const eligibleAgents: AgentProfileDocument[] = [];
    for (const agent of departmentAndDomainEligibleAgents) {
      const activeChats =
        await this.chatSessionService.countActiveChatsForAgent(agent.userId);
      if (activeChats < agent.maxConcurrentChats) {
        eligibleAgents.push(agent);
      }
    }

    this.logger.log(
      `Found ${eligibleAgents.length} eligible agents for widget ${widgetId} and domain ${domain}`,
    );
    return eligibleAgents;
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

      // Get all widgets that have at least one department matching the agent's departments
      const widgets = await this.widgetsService.findWidgetsByDepartments(
        agent.departmentIds.map((dept) => dept.toString()),
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
}
