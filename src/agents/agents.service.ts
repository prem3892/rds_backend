import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
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

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly departmentsService: DepartmentsService,
    @Inject(forwardRef(() => ChatSessionService))
    private readonly chatSessionService: ChatSessionService,
  ) {}

  async createAgentProfile(
    userId: Types.ObjectId,
    initialProfileData: Partial<AgentProfile> = {},
  ): Promise<AgentProfileDocument> {
    const user = await this.usersService.findById(userId);
    if (!user || user.role !== UserRole.AGENT) {
      throw new BadRequestException('User is not an Agent or does not exist.');
    }

    const existingProfile = await this.agentProfileModel
      .findById(userId)
      .exec();
    if (existingProfile) {
      // Potentially update if called again, or throw ConflictException
      // For now, let's assume it can be updated if called again with new data
      Object.assign(existingProfile, initialProfileData, { userId }); // Ensure userId is set
      return existingProfile.save();
    }

    const agentProfile = new this.agentProfileModel({
      ...initialProfileData,
      userId: userId, // Explicitly set userId
      _id: userId, // Ensure _id is the same as userId
    });
    return agentProfile.save();
  }

  async deleteAgentProfile(
    userId: Types.ObjectId,
  ): Promise<AgentProfileDocument | null> {
    return this.agentProfileModel.findByIdAndDelete(userId).exec();
  }

  async findAgentProfileByUserId(
    userId: string | Types.ObjectId,
  ): Promise<AgentProfileDocument | null> {
    return this.agentProfileModel
      .findById(userId)
      .populate('departmentIds')
      .exec();
  }

  async findAgentProfileByUserIdOrFail(
    userId: string | Types.ObjectId,
  ): Promise<AgentProfileDocument> {
    const profile = await this.findAgentProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundException(
        `Agent profile for user ID ${userId} not found.`,
      );
    }
    return profile;
  }

  async getAllAgentProfilesWithUserDetails(): Promise<any[]> {
    const agentProfiles = await this.agentProfileModel
      .find()
      .populate('departmentIds')
      .lean()
      .exec();
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

  async updateAgentProfile(
    agentUserId: string,
    updateDto: UpdateAgentProfileDto,
    isAdminUpdate: boolean = false, // to distinguish admin updates from agent's own
  ): Promise<AgentProfileDocument> {
    const agentProfile = await this.agentProfileModel
      .findById(agentUserId)
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

  async setOnlineStatus(
    agentUserId: string,
    isOnline: boolean,
  ): Promise<AgentProfileDocument> {
    const agentProfile = await this.agentProfileModel
      .findById(agentUserId)
      .exec();
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
    departmentId: Types.ObjectId,
    domain: string,
  ): Promise<AgentProfileDocument[]> {
    const agents = await this.agentProfileModel
      .find({
        isOnline: true,
        departmentIds: departmentId,
        $or: [
          // domainAccess can be specific or wildcard
          { domainAccess: domain },
          { domainAccess: '*' },
        ],
      })
      .exec();

    // Further filter by maxConcurrentChats
    const eligibleAgents: AgentProfileDocument[] = [];
    for (const agent of agents) {
      const activeChats =
        await this.chatSessionService.countActiveChatsForAgent(agent.userId);
      if (activeChats < agent.maxConcurrentChats) {
        eligibleAgents.push(agent);
      }
    }
    return eligibleAgents;
  }
}
