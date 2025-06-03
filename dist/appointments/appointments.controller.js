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
exports.AppointmentsController = void 0;
const common_1 = require("@nestjs/common");
const appointments_service_1 = require("./appointments.service");
const create_appointment_dto_1 = require("./dto/create-appointment.dto");
const jwt_auth_guard_1 = require("../shared/guards/jwt-auth.guard");
const roles_guard_1 = require("../shared/guards/roles.guard");
const roles_decorator_1 = require("../shared/decorators/roles.decorator");
const enums_1 = require("../shared/constants/enums");
const user_decorator_1 = require("../shared/decorators/user.decorator");
const class_validator_1 = require("class-validator");
const mongoose_1 = require("mongoose");
class UpdateAppointmentStatusDto {
    status;
}
__decorate([
    (0, class_validator_1.IsEnum)(enums_1.AppointmentStatus),
    __metadata("design:type", String)
], UpdateAppointmentStatusDto.prototype, "status", void 0);
let AppointmentsController = class AppointmentsController {
    appointmentsService;
    constructor(appointmentsService) {
        this.appointmentsService = appointmentsService;
    }
    create(createAppointmentDto, user) {
        return this.appointmentsService.create(createAppointmentDto, user);
    }
    findAllByAdmin(agentId, customerId, status) {
        const filters = {};
        if (agentId) {
            if (!mongoose_1.Types.ObjectId.isValid(agentId))
                throw new common_1.BadRequestException('Invalid agentId format');
            filters.agentId = agentId;
        }
        if (customerId) {
            if (!mongoose_1.Types.ObjectId.isValid(customerId))
                throw new common_1.BadRequestException('Invalid customerId format');
            filters.customerId = customerId;
        }
        if (status)
            filters.status = status;
        return this.appointmentsService.findAll(filters);
    }
    findMyAgentAppointments(user) {
        return this.appointmentsService.findForAgent(user.sub);
    }
    async findOne(id, user) {
        const appointment = await this.appointmentsService.findById(id);
        if (user.role === enums_1.UserRole.AGENT &&
            appointment.agentId.toString() !== user.sub) {
            throw new common_1.ForbiddenException('You do not have permission to view this appointment.');
        }
        return appointment;
    }
    updateStatus(id, body, user) {
        return this.appointmentsService.updateStatus(id, body.status, user);
    }
};
exports.AppointmentsController = AppointmentsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.AGENT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.AuthenticatedUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_appointment_dto_1.CreateAppointmentDto, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('agentId')),
    __param(1, (0, common_1.Query)('customerId')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "findAllByAdmin", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.AGENT),
    __param(0, (0, user_decorator_1.AuthenticatedUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "findMyAgentAppointments", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.AGENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, user_decorator_1.AuthenticatedUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppointmentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN, enums_1.UserRole.AGENT),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, user_decorator_1.AuthenticatedUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateAppointmentStatusDto, Object]),
    __metadata("design:returntype", void 0)
], AppointmentsController.prototype, "updateStatus", null);
exports.AppointmentsController = AppointmentsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('appointments'),
    __metadata("design:paramtypes", [appointments_service_1.AppointmentsService])
], AppointmentsController);
//# sourceMappingURL=appointments.controller.js.map