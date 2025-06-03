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
var ChatNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatNotificationService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const chat_gateway_1 = require("../../chat.gateway");
const enums_1 = require("../../../shared/constants/enums");
const chat_session_service_1 = require("../chat-session/chat-session.service");
const agents_service_1 = require("../../../agents/agents.service");
let ChatNotificationService = ChatNotificationService_1 = class ChatNotificationService {
    chatSessionService;
    agentsService;
    chatGateway;
    configService;
    logger = new common_1.Logger(ChatNotificationService_1.name);
    firstAlertThresholdMs;
    subsequentAlertIntervalMs;
    maxPriorityAlerts;
    constructor(chatSessionService, agentsService, chatGateway, configService) {
        this.chatSessionService = chatSessionService;
        this.agentsService = agentsService;
        this.chatGateway = chatGateway;
        this.configService = configService;
        this.firstAlertThresholdMs =
            this.configService.get('chatTimers.firstAlertThresholdMs') ||
                60000;
        this.subsequentAlertIntervalMs =
            this.configService.get('chatTimers.subsequentAlertIntervalMs') ||
                60000;
        this.maxPriorityAlerts =
            this.configService.get('chatTimers.maxPriorityAlerts') || 3;
    }
    async handleUnattendedChatNotifications() {
        this.logger.debug('Running unattended chat notification job...');
        const pendingSessions = await this.chatSessionService.getPendingAssignmentSessions(this.firstAlertThresholdMs, this.subsequentAlertIntervalMs, this.maxPriorityAlerts);
        for (const session of pendingSessions) {
            this.logger.debug(`Processing pending session: ${session._id}, count: ${session.priorityNotificationSentCount}`);
            const eligibleAgents = await this.agentsService.getEligibleOnlineAgents(session.departmentId._id, session.domain);
            if (eligibleAgents.length > 0) {
                this.logger.log(`Found ${eligibleAgents.length} eligible agents for session ${session._id}. Sending priority notification.`);
                for (const agent of eligibleAgents) {
                    this.chatGateway.sendPriorityChatNotification(agent.userId.toString(), session);
                }
                await this.chatSessionService.incrementPriorityNotificationCount(session._id);
            }
            else {
                this.logger.warn(`No eligible agents found for priority notification for session ${session._id}.`);
            }
        }
        const expiredSessions = await this.chatSessionService.getExpiredPendingSessions(this.subsequentAlertIntervalMs, this.maxPriorityAlerts);
        for (const session of expiredSessions) {
            this.logger.log(`Session ${session._id} has expired pending assignment. Updating status.`);
            const updated = await this.chatSessionService.updateSessionStatus(session._id, enums_1.ChatSessionStatus.EXPIRED_PENDING_ASSIGNMENT);
            if (updated) {
                this.chatGateway.notifyCustomerSessionExpired(updated.customerId.toString(), updated);
            }
        }
    }
};
exports.ChatNotificationService = ChatNotificationService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_SECONDS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatNotificationService.prototype, "handleUnattendedChatNotifications", null);
exports.ChatNotificationService = ChatNotificationService = ChatNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [chat_session_service_1.ChatSessionService,
        agents_service_1.AgentsService,
        chat_gateway_1.ChatGateway,
        config_1.ConfigService])
], ChatNotificationService);
//# sourceMappingURL=chat-notification.service.js.map