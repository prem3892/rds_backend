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
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const appointment_schema_1 = require("../schemas/appointment.schema");
const users_service_1 = require("../users/users.service");
const customers_service_1 = require("../customers/customers.service");
const enums_1 = require("../shared/constants/enums");
const chat_session_service_1 = require("../chat/services/chat-session/chat-session.service");
let AppointmentsService = class AppointmentsService {
    appointmentModel;
    chatSessionService;
    usersService;
    customersService;
    constructor(appointmentModel, chatSessionService, usersService, customersService) {
        this.appointmentModel = appointmentModel;
        this.chatSessionService = chatSessionService;
        this.usersService = usersService;
        this.customersService = customersService;
    }
    async create(createDto, requestingUser) {
        const chatSession = await this.chatSessionService.findById(createDto.chatSessionId);
        if (!chatSession) {
            throw new common_1.NotFoundException(`Chat session with ID ${createDto.chatSessionId} not found.`);
        }
        const customer = await this.customersService.findById(createDto.customerId);
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${createDto.customerId} not found.`);
        }
        if (chatSession.customerId.toString() !== customer._id.toString()) {
            throw new common_1.BadRequestException('Customer ID does not match the customer in the chat session.');
        }
        let agentIdToAssign;
        if (requestingUser.role === enums_1.UserRole.ADMIN) {
            if (!createDto.agentId) {
                throw new common_1.BadRequestException('Agent ID is required for admin to book an appointment.');
            }
            const agentUser = await this.usersService.findById(createDto.agentId);
            if (!agentUser || agentUser.role !== enums_1.UserRole.AGENT) {
                throw new common_1.NotFoundException(`Agent with ID ${createDto.agentId} not found or is not an agent.`);
            }
            agentIdToAssign = agentUser._id;
        }
        else if (requestingUser.role === enums_1.UserRole.AGENT) {
            agentIdToAssign = new mongoose_2.Types.ObjectId(requestingUser.sub);
            if (chatSession.agentId &&
                chatSession.agentId.toString() !== requestingUser.sub) {
                throw new common_1.ForbiddenException('Agent is not assigned to this chat session.');
            }
        }
        else {
            throw new common_1.ForbiddenException('User role not authorized to book appointments.');
        }
        const appointment = new this.appointmentModel({
            ...createDto,
            agentId: agentIdToAssign,
            customerId: customer._id,
            chatSessionId: chatSession._id,
        });
        return appointment.save();
    }
    async findAll(filters) {
        const query = {};
        if (filters.agentId)
            query.agentId = new mongoose_2.Types.ObjectId(filters.agentId);
        if (filters.customerId)
            query.customerId = new mongoose_2.Types.ObjectId(filters.customerId);
        if (filters.status)
            query.status = filters.status;
        return this.appointmentModel
            .find(query)
            .populate('agentId', 'firstName lastName email')
            .populate('customerId', 'name email')
            .populate('chatSessionId', 'initialMessage')
            .sort({ appointmentTime: -1 })
            .exec();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid appointment ID format');
        }
        const appointment = await this.appointmentModel
            .findById(id)
            .populate('agentId', 'firstName lastName email')
            .populate('customerId', 'name email')
            .populate('chatSessionId', 'initialMessage')
            .exec();
        if (!appointment) {
            throw new common_1.NotFoundException(`Appointment with ID ${id} not found`);
        }
        return appointment;
    }
    async findForAgent(agentId) {
        return this.findAll({ agentId });
    }
    async updateStatus(id, status, requestingUser) {
        const appointment = await this.findById(id);
        if (requestingUser.role !== enums_1.UserRole.ADMIN &&
            appointment.agentId.toString() !== requestingUser.sub) {
            throw new common_1.ForbiddenException('You are not authorized to update this appointment.');
        }
        appointment.status = status;
        return appointment.save();
    }
    async cancel(id, requestingUser) {
        return this.updateStatus(id, enums_1.AppointmentStatus.CANCELLED, requestingUser);
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        chat_session_service_1.ChatSessionService,
        users_service_1.UsersService,
        customers_service_1.CustomersService])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map