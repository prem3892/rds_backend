import { AgentsService } from './agents.service';
import { UpdateAgentProfileDto } from './dto/update-agent-profile.dto';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';
export declare class AgentsController {
    private readonly agentsService;
    private readonly usersService;
    constructor(agentsService: AgentsService, usersService: UsersService);
    getAllAgentsWithProfiles(): Promise<any[]>;
    getMyProfile(user: JwtPayload): Promise<any>;
    updateMyProfile(user: JwtPayload, updateDto: UpdateAgentProfileDto & {
        password?: string;
    }): Promise<any>;
    updateAgentProfileByAdmin(agentId: string, updateDto: UpdateAgentProfileDto & {
        password?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
    }): Promise<any>;
    setOnlineStatus(user: JwtPayload, body: {
        isOnline: boolean;
    }): Promise<import("../schemas/agent-profile.schema").AgentProfileDocument>;
}
