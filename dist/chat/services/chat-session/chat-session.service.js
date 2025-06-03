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
var ChatSessionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const chat_session_schema_1 = require("../../../schemas/chat-session.schema");
const enums_1 = require("../../../shared/constants/enums");
const agents_service_1 = require("../../../agents/agents.service");
const customers_service_1 = require("../../../customers/customers.service");
const widgets_service_1 = require("../../../widgets/widgets.service");
const departments_service_1 = require("../../../departments/departments.service");
let ChatSessionService = ChatSessionService_1 = class ChatSessionService {
    chatSessionModel;
    agentsService;
    customersService;
    widgetsService;
    departmentsService;
    logger = new common_1.Logger(ChatSessionService_1.name);
    constructor(chatSessionModel, agentsService, customersService, widgetsService, departmentsService) {
        this.chatSessionModel = chatSessionModel;
        this.agentsService = agentsService;
        this.customersService = customersService;
        this.widgetsService = widgetsService;
        this.departmentsService = departmentsService;
    }
    async findById(id) {
        return this.chatSessionModel
            .findById(id)
            .populate('widgetId')
            .populate('customerId')
            .populate({ path: 'agentId', select: 'firstName lastName email role' })
            .populate('departmentId')
            .exec();
    }
    async findByIdOrFail(id) {
        const session = await this.findById(id);
        if (!session) {
            throw new common_1.NotFoundException(`Chat session with ID ${id} not found.`);
        }
        return session;
    }
    async initiateChat(dto, domain, customer) {
        const existingSession = await this.chatSessionModel
            .findOne({
            customerId: customer._id,
            widgetId: new mongoose_2.Types.ObjectId(dto.widgetId),
            status: {
                $in: [
                    enums_1.ChatSessionStatus.PENDING_ASSIGNMENT,
                    enums_1.ChatSessionStatus.ACTIVE,
                    enums_1.ChatSessionStatus.PENDING_AGENT_RECONNECT,
                ],
            },
        })
            .exec();
        if (existingSession) {
            this.logger.log(`Customer ${customer._id} already has an active/pending session ${existingSession._id}`);
            return {
                session: await this.findByIdOrFail(existingSession._id),
                wasNew: false,
            };
        }
        const widget = await this.widgetsService.findById(dto.widgetId);
        if (!widget || !widget.isEnabled) {
            throw new common_1.BadRequestException('Widget not found or is disabled.');
        }
        if (!widget.domains.includes(domain) && !widget.domains.includes('*')) {
        }
        const department = await this.departmentsService.findById(dto.departmentId);
        if (!department) {
            throw new common_1.BadRequestException('Department not found.');
        }
        if (!widget.departmentIds
            .map((id) => id.toString())
            .includes(department._id.toString())) {
            throw new common_1.BadRequestException('Department not valid for this widget.');
        }
        if (dto.name || dto.email) {
            await this.customersService.updateCustomerDetails(customer._id.toString(), { name: dto.name, email: dto.email });
        }
        const newSession = new this.chatSessionModel({
            widgetId: widget._id,
            customerId: customer._id,
            departmentId: department._id,
            initialMessage: dto.initialMessage,
            domain: domain,
            status: enums_1.ChatSessionStatus.PENDING_ASSIGNMENT,
            initiatedAt: new Date(),
            lastMessageAt: new Date(),
            customerLastSeen: new Date(),
        });
        const savedSession = await newSession.save();
        this.logger.log(`New chat session ${savedSession._id} initiated by customer ${customer._id}`);
        return {
            session: await this.findByIdOrFail(savedSession._id),
            wasNew: true,
        };
    }
    async acceptChat(chatSessionId, agentId) {
        const agentObjectId = new mongoose_2.Types.ObjectId(agentId);
        const sessionObjectId = new mongoose_2.Types.ObjectId(chatSessionId);
        const updatedSession = await this.chatSessionModel
            .findOneAndUpdate({
            _id: sessionObjectId,
            status: enums_1.ChatSessionStatus.PENDING_ASSIGNMENT,
            agentId: null,
        }, {
            $set: {
                agentId: agentObjectId,
                status: enums_1.ChatSessionStatus.ACTIVE,
                acceptedAt: new Date(),
                agentLastSeen: new Date(),
            },
        }, { new: true })
            .populate('widgetId')
            .populate('customerId')
            .populate({ path: 'agentId', select: 'firstName lastName email role' })
            .populate('departmentId')
            .exec();
        if (updatedSession) {
            this.logger.log(`Chat session ${chatSessionId} accepted by agent ${agentId}`);
        }
        else {
            this.logger.warn(`Failed to accept chat session ${chatSessionId} by agent ${agentId} (already accepted or not pending)`);
        }
        return updatedSession;
    }
    async updateSessionStatus(sessionId, status, endedAt) {
        const update = { status };
        if (endedAt ||
            [
                enums_1.ChatSessionStatus.RESOLVED,
                enums_1.ChatSessionStatus.CLOSED_BY_AGENT,
                enums_1.ChatSessionStatus.CLOSED_BY_CUSTOMER,
                enums_1.ChatSessionStatus.ABANDONED_BY_AGENT,
                enums_1.ChatSessionStatus.ABANDONED_BY_CUSTOMER,
                enums_1.ChatSessionStatus.EXPIRED_PENDING_ASSIGNMENT,
            ].includes(status)) {
            update.endedAt = endedAt || new Date();
        }
        const updatedSession = await this.chatSessionModel
            .findByIdAndUpdate(sessionId, { $set: update }, { new: true })
            .populate('widgetId')
            .populate('customerId')
            .populate({ path: 'agentId', select: 'firstName lastName email role' })
            .populate('departmentId')
            .exec();
        if (!updatedSession) {
            throw new common_1.NotFoundException(`Chat session with ID ${sessionId} not found for status update.`);
        }
        this.logger.log(`Chat session ${sessionId} status updated to ${status}`);
        return updatedSession;
    }
    async countActiveChatsForAgent(agentId) {
        return this.chatSessionModel
            .countDocuments({
            agentId: agentId,
            status: enums_1.ChatSessionStatus.ACTIVE,
        })
            .exec();
    }
    async getActiveSessionsForAgent(agentId) {
        return this.chatSessionModel
            .find({
            agentId: new mongoose_2.Types.ObjectId(agentId),
            status: enums_1.ChatSessionStatus.ACTIVE,
        })
            .populate('widgetId', 'name')
            .populate('customerId', 'name email metadata')
            .populate('departmentId', 'name')
            .sort({ lastMessageAt: -1 })
            .exec();
    }
    async getPendingAssignmentSessions(firstAlertThresholdMs, subsequentAlertIntervalMs, maxPriorityAlerts) {
        const now = new Date();
        return this.chatSessionModel
            .find({
            status: enums_1.ChatSessionStatus.PENDING_ASSIGNMENT,
            $or: [
                {
                    priorityNotificationSentCount: 0,
                    initiatedAt: {
                        $lte: new Date(now.getTime() - firstAlertThresholdMs),
                    },
                },
                {
                    priorityNotificationSentCount: { $gt: 0, $lt: maxPriorityAlerts },
                    lastPriorityNotificationSentAt: {
                        $lte: new Date(now.getTime() - subsequentAlertIntervalMs),
                    },
                },
            ],
        })
            .populate('departmentId')
            .populate('customerId')
            .exec();
    }
    async getExpiredPendingSessions(subsequentAlertIntervalMs, maxPriorityAlerts) {
        const now = new Date();
        return this.chatSessionModel
            .find({
            status: enums_1.ChatSessionStatus.PENDING_ASSIGNMENT,
            priorityNotificationSentCount: { $gte: maxPriorityAlerts },
            lastPriorityNotificationSentAt: {
                $lte: new Date(now.getTime() - subsequentAlertIntervalMs),
            },
        })
            .exec();
    }
    async incrementPriorityNotificationCount(sessionId) {
        return this.chatSessionModel
            .findByIdAndUpdate(sessionId, {
            $inc: { priorityNotificationSentCount: 1 },
            $set: { lastPriorityNotificationSentAt: new Date() },
        }, { new: true })
            .exec();
    }
    async updateLastMessageTimestamp(sessionId, timestamp = new Date()) {
        await this.chatSessionModel
            .findByIdAndUpdate(sessionId, { $set: { lastMessageAt: timestamp } })
            .exec();
    }
    async updateCustomerLastSeen(sessionId, timestamp = new Date()) {
        await this.chatSessionModel
            .findByIdAndUpdate(sessionId, { $set: { customerLastSeen: timestamp } })
            .exec();
    }
    async updateAgentLastSeen(sessionId, timestamp = new Date()) {
        await this.chatSessionModel
            .findByIdAndUpdate(sessionId, { $set: { agentLastSeen: timestamp } })
            .exec();
    }
    async findAllPaginated(queryDto) {
        const { limit = 10, page = 1, status, agentId, departmentId, customerName, customerEmail, } = queryDto;
        const skip = (page - 1) * limit;
        const query = {};
        if (status)
            query.status = status;
        if (agentId) {
            if (!mongoose_2.Types.ObjectId.isValid(agentId))
                throw new common_1.BadRequestException('Invalid agent ID format');
            query.agentId = new mongoose_2.Types.ObjectId(agentId);
        }
        if (departmentId) {
            if (!mongoose_2.Types.ObjectId.isValid(departmentId))
                throw new common_1.BadRequestException('Invalid department ID format');
            query.departmentId = new mongoose_2.Types.ObjectId(departmentId);
        }
        let customerIds = undefined;
        if (customerName || customerEmail) {
            customerIds = await this.customersService.findCustomersByNameOrEmail(customerName, customerEmail);
            if (customerIds.length === 0 && (customerName || customerEmail)) {
                return { data: [], total: 0 };
            }
            if (customerIds.length > 0) {
                query.customerId = { $in: customerIds };
            }
        }
        const data = await this.chatSessionModel
            .find(query)
            .populate('widgetId', 'name')
            .populate('customerId', 'name email')
            .populate({ path: 'agentId', select: 'firstName lastName email' })
            .populate('departmentId', 'name')
            .sort({ initiatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
        const total = await this.chatSessionModel.countDocuments(query).exec();
        return { data, total };
    }
    async getSessionsForAgentReconnect(agentId) {
        return this.chatSessionModel
            .find({
            agentId: agentId,
            status: enums_1.ChatSessionStatus.PENDING_AGENT_RECONNECT,
        })
            .populate('customerId')
            .exec();
    }
    async getSessionsForCustomerReconnect(customerId) {
        return this.chatSessionModel
            .find({
            customerId: customerId,
            status: {
                $in: [
                    enums_1.ChatSessionStatus.ACTIVE,
                    enums_1.ChatSessionStatus.PENDING_AGENT_RECONNECT,
                ],
            },
        })
            .populate({ path: 'agentId', select: 'firstName lastName' })
            .exec();
    }
};
exports.ChatSessionService = ChatSessionService;
exports.ChatSessionService = ChatSessionService = ChatSessionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(chat_session_schema_1.ChatSession.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => agents_service_1.AgentsService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        agents_service_1.AgentsService,
        customers_service_1.CustomersService,
        widgets_service_1.WidgetsService,
        departments_service_1.DepartmentsService])
], ChatSessionService);
//# sourceMappingURL=chat-session.service.js.map