"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const agent_profile_schema_1 = require("../schemas/agent-profile.schema");
const users_service_1 = require("../users/users.service");
const enums_1 = require("../shared/constants/enums");
const departments_service_1 = require("../departments/departments.service");
const chat_session_service_1 = require("../chat/services/chat-session/chat-session.service");
let AgentsService = class AgentsService {
    agentProfileModel;
    usersService;
    departmentsService;
    chatSessionService;
    constructor(agentProfileModel, usersService, departmentsService, chatSessionService) {
        this.agentProfileModel = agentProfileModel;
        this.usersService = usersService;
        this.departmentsService = departmentsService;
        this.chatSessionService = chatSessionService;
    }
    async createAgentProfile(userId, adminId, initialProfileData = {}) {
        const user = await this.usersService.findById(userId);
        if (!user ||
            (user.role !== enums_1.UserRole.AGENT && user.role !== enums_1.UserRole.ADMIN)) {
            throw new common_1.BadRequestException('User is not an Agent/Admin or does not exist.');
        }
        const effectiveAdminId = adminId || userId;
        const existingProfile = await this.agentProfileModel
            .findById(userId)
            .exec();
        if (existingProfile) {
            Object.assign(existingProfile, initialProfileData, {
                userId,
                adminId: effectiveAdminId,
            });
            return existingProfile.save();
        }
        const agentProfile = new this.agentProfileModel({
            ...initialProfileData,
            userId: userId,
            adminId: effectiveAdminId,
        });
        return agentProfile.save();
    }
    async deleteAgentProfile(userId) {
        return this.agentProfileModel.findByIdAndDelete(userId).exec();
    }
    async findAgentProfileByUserId(userId) {
        return this.agentProfileModel
            .findById(userId)
            .populate('departmentIds')
            .exec();
    }
    async findAgentProfileByUserIdOrFail(userId) {
        const profile = await this.findAgentProfileByUserId(userId);
        if (!profile) {
            throw new common_1.NotFoundException(`Agent profile for user ID ${userId} not found.`);
        }
        return profile;
    }
    async getAllAgentProfilesWithUserDetails() {
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
                user: userDetails || null,
            };
        });
    }
    async updateAgentProfile(agentUserId, updateDto, isAdminUpdate = false) {
        const agentProfile = await this.agentProfileModel
            .findById(agentUserId)
            .exec();
        if (!agentProfile) {
            throw new common_1.NotFoundException(`Agent profile for user ID ${agentUserId} not found.`);
        }
        if (updateDto.departmentIds) {
            if (updateDto.departmentIds.length > 0) {
                const departments = await this.departmentsService.findByIds(updateDto.departmentIds.map((id) => new mongoose_2.Types.ObjectId(id)));
                if (departments.length !== updateDto.departmentIds.length) {
                    throw new common_1.BadRequestException('One or more department IDs are invalid.');
                }
            }
            agentProfile.departmentIds = updateDto.departmentIds.map((id) => new mongoose_2.Types.ObjectId(id));
        }
        if (updateDto.domainAccess)
            agentProfile.domainAccess = updateDto.domainAccess;
        if (typeof updateDto.isOnline === 'boolean') {
            agentProfile.isOnline = updateDto.isOnline;
            if (updateDto.isOnline === false || updateDto.isOnline === true) {
                agentProfile.lastSeen = new Date();
            }
        }
        if (updateDto.maxConcurrentChats)
            agentProfile.maxConcurrentChats = updateDto.maxConcurrentChats;
        return agentProfile.save();
    }
    async setOnlineStatus(agentUserId, isOnline) {
        const agentProfile = await this.agentProfileModel
            .findOne({ userId: new mongoose_2.Types.ObjectId(agentUserId) })
            .populate('departmentIds')
            .exec();
        common_1.Logger.log(`Setting online status for agent ${agentProfile?.userId}: ${isOnline}`);
        if (!agentProfile) {
            throw new common_1.NotFoundException(`Agent profile for user ID ${agentUserId} not found.`);
        }
        agentProfile.isOnline = isOnline;
        agentProfile.lastSeen = new Date();
        return agentProfile.save();
    }
    async getEligibleOnlineAgents(departmentId, domain) {
        const agents = await this.agentProfileModel
            .find({
            isOnline: true,
            departmentIds: departmentId,
            $or: [
                { domainAccess: domain },
                { domainAccess: '*' },
            ],
        })
            .exec();
        const eligibleAgents = [];
        for (const agent of agents) {
            const activeChats = await this.chatSessionService.countActiveChatsForAgent(agent.userId);
            if (activeChats < agent.maxConcurrentChats) {
                eligibleAgents.push(agent);
            }
        }
        return eligibleAgents;
    }
};
exports.AgentsService = AgentsService;
exports.AgentsService = AgentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(agent_profile_schema_1.AgentProfile.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => chat_session_service_1.ChatSessionService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        users_service_1.UsersService,
        departments_service_1.DepartmentsService,
        chat_session_service_1.ChatSessionService])
], AgentsService);
//# sourceMappingURL=agents.service.js.map