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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_message_service_1 = require("./services/chat-message/chat-message.service");
const chat_session_service_1 = require("./services/chat-session/chat-session.service");
const jwt_auth_guard_1 = require("../shared/guards/jwt-auth.guard");
const roles_guard_1 = require("../shared/guards/roles.guard");
const roles_decorator_1 = require("../shared/decorators/roles.decorator");
const enums_1 = require("../shared/constants/enums");
const user_decorator_1 = require("../shared/decorators/user.decorator");
const get_messages_dto_1 = require("./dto/get-messages.dto");
const get_chat_session_dto_1 = require("./dto/get-chat-session.dto");
const mongoose_1 = require("mongoose");
let ChatController = class ChatController {
    chatMessageService;
    chatSessionService;
    constructor(chatMessageService, chatSessionService) {
        this.chatMessageService = chatMessageService;
        this.chatSessionService = chatSessionService;
    }
    async getAllChatSessions(queryDto) {
        return this.chatSessionService.findAllPaginated(queryDto);
    }
    async getMyActiveSessions(user) {
        return this.chatSessionService.getActiveSessionsForAgent(user.sub);
    }
    async getMessagesForSession(sessionId, queryDto, user) {
        if (!mongoose_1.Types.ObjectId.isValid(sessionId)) {
            throw new common_1.BadRequestException('Invalid session ID format');
        }
        const session = await this.chatSessionService.findByIdOrFail(sessionId);
        if (user.role === enums_1.UserRole.AGENT) {
            if (!session.agentId || session.agentId._id.toString() !== user.sub) {
                throw new common_1.ForbiddenException('You do not have permission to view messages for this session.');
            }
        }
        const limit = queryDto.limit ? Number(queryDto.limit) : 50;
        const page = queryDto.page ? Number(queryDto.page) : 1;
        return this.chatMessageService.getMessagesForSession(sessionId, limit, page);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('sessions'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_chat_session_dto_1.GetChatSessionsQueryDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getAllChatSessions", null);
__decorate([
    (0, common_1.Get)('sessions/my-active'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.AGENT),
    __param(0, (0, user_decorator_1.AuthenticatedUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMyActiveSessions", null);
__decorate([
    (0, common_1.Get)('sessions/:sessionId/messages'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.AGENT),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Query)(new common_1.ValidationPipe({ transform: true }))),
    __param(2, (0, user_decorator_1.AuthenticatedUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, get_messages_dto_1.GetMessagesQueryDto, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessagesForSession", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_message_service_1.ChatMessageService,
        chat_session_service_1.ChatSessionService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map