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
exports.AgentsController = void 0;
const common_1 = require("@nestjs/common");
const agents_service_1 = require("./agents.service");
const jwt_auth_guard_1 = require("../shared/guards/jwt-auth.guard");
const roles_guard_1 = require("../shared/guards/roles.guard");
const roles_decorator_1 = require("../shared/decorators/roles.decorator");
const enums_1 = require("../shared/constants/enums");
const user_decorator_1 = require("../shared/decorators/user.decorator");
const users_service_1 = require("../users/users.service");
const mongoose_1 = require("mongoose");
let AgentsController = class AgentsController {
    agentsService;
    usersService;
    constructor(agentsService, usersService) {
        this.agentsService = agentsService;
        this.usersService = usersService;
    }
    async getAllAgentsWithProfiles() {
        return this.agentsService.getAllAgentProfilesWithUserDetails();
    }
    async getMyProfile(user) {
        const agentProfile = await this.agentsService.findAgentProfileByUserId(user.sub);
        if (!agentProfile) {
            throw new common_1.NotFoundException('Agent profile not found.');
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
    async updateMyProfile(user, updateDto) {
        if (updateDto.password) {
            await this.usersService.update(user.sub, {
                password: updateDto.password,
            });
        }
        const allowedProfileUpdates = {};
        if (updateDto.maxConcurrentChats)
            allowedProfileUpdates.maxConcurrentChats = updateDto.maxConcurrentChats;
        const updatedProfile = await this.agentsService.updateAgentProfile(user.sub, allowedProfileUpdates);
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
    async updateAgentProfileByAdmin(agentId, updateDto) {
        if (!mongoose_1.Types.ObjectId.isValid(agentId)) {
            throw new common_1.BadRequestException('Invalid agent ID format');
        }
        const userToUpdate = await this.usersService.findByIdOrFail(agentId);
        if (userToUpdate.role !== enums_1.UserRole.AGENT) {
            throw new common_1.BadRequestException('This user is not an agent.');
        }
        const userUpdatePayload = {};
        if (updateDto.password)
            userUpdatePayload.password = updateDto.password;
        if (updateDto.firstName)
            userUpdatePayload.firstName = updateDto.firstName;
        if (updateDto.lastName)
            userUpdatePayload.lastName = updateDto.lastName;
        if (updateDto.email)
            userUpdatePayload.email = updateDto.email;
        if (Object.keys(userUpdatePayload).length > 0) {
            await this.usersService.update(agentId, userUpdatePayload);
        }
        const agentProfileUpdatePayload = { ...updateDto };
        delete agentProfileUpdatePayload['password'];
        delete agentProfileUpdatePayload['firstName'];
        delete agentProfileUpdatePayload['lastName'];
        delete agentProfileUpdatePayload['email'];
        const updatedProfile = await this.agentsService.updateAgentProfile(agentId, agentProfileUpdatePayload, true);
        const userDetails = await this.usersService.findById(agentId);
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
    async setOnlineStatus(user, body) {
        if (typeof body.isOnline !== 'boolean') {
            throw new common_1.BadRequestException('isOnline must be a boolean.');
        }
        return this.agentsService.setOnlineStatus(user.sub, body.isOnline);
    }
};
exports.AgentsController = AgentsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getAllAgentsWithProfiles", null);
__decorate([
    (0, common_1.Get)('me/profile'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.AGENT),
    __param(0, (0, user_decorator_1.AuthenticatedUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Put)('me/profile'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.AGENT),
    __param(0, (0, user_decorator_1.AuthenticatedUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "updateMyProfile", null);
__decorate([
    (0, common_1.Put)(':agentId/profile'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('agentId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "updateAgentProfileByAdmin", null);
__decorate([
    (0, common_1.Patch)('status'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.AGENT),
    __param(0, (0, user_decorator_1.AuthenticatedUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "setOnlineStatus", null);
exports.AgentsController = AgentsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('agents'),
    __metadata("design:paramtypes", [agents_service_1.AgentsService,
        users_service_1.UsersService])
], AgentsController);
//# sourceMappingURL=agents.controller.js.map