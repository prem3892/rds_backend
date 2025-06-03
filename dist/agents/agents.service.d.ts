import { Model, Types } from 'mongoose';
import { AgentProfile, AgentProfileDocument } from 'src/schemas/agent-profile.schema';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from 'src/departments/departments.service';
import { ChatSessionService } from 'src/chat/services/chat-session/chat-session.service';
export declare class AgentsService {
    private agentProfileModel;
    private readonly usersService;
    private readonly departmentsService;
    private readonly chatSessionService;
    constructor(agentProfileModel: Model<AgentProfileDocument>, usersService: UsersService, departmentsService: DepartmentsService, chatSessionService: ChatSessionService);
    createAgentProfile(userId: Types.ObjectId, initialProfileData?: Partial<AgentProfile>): Promise<AgentProfileDocument>;
    deleteAgentProfile(userId: Types.ObjectId): Promise<AgentProfileDocument | null>;
    findAgentProfileByUserId(userId: string | Types.ObjectId): Promise<AgentProfileDocument | null>;
    findAgentProfileByUserIdOrFail(userId: string | Types.ObjectId): Promise<AgentProfileDocument>;
    getAllAgentProfilesWithUserDetails(): Promise<any[]>;
    updateAgentProfile(agentUserId: string, updateDto: UpdateAgentProfileDto, isAdminUpdate?: boolean): Promise<AgentProfileDocument>;
    setOnlineStatus(agentUserId: string, isOnline: boolean): Promise<AgentProfileDocument>;
    getEligibleOnlineAgents(departmentId: Types.ObjectId, domain: string): Promise<AgentProfileDocument[]>;
}
