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
exports.WidgetsController = void 0;
const common_1 = require("@nestjs/common");
const widgets_service_1 = require("./widgets.service");
const update_widget_dto_1 = require("./dto/update-widget.dto");
const jwt_auth_guard_1 = require("../shared/guards/jwt-auth.guard");
const roles_guard_1 = require("../shared/guards/roles.guard");
const roles_decorator_1 = require("../shared/decorators/roles.decorator");
const enums_1 = require("../shared/constants/enums");
const user_decorator_1 = require("../shared/decorators/user.decorator");
const mongoose_1 = require("mongoose");
const create_widget_dto_1 = require("../departments/dto/create-widget.dto");
let WidgetsController = class WidgetsController {
    widgetsService;
    constructor(widgetsService) {
        this.widgetsService = widgetsService;
    }
    create(createWidgetDto, user) {
        return this.widgetsService.create(createWidgetDto, new mongoose_1.Types.ObjectId(user.sub));
    }
    findAll() {
        return this.widgetsService.findAll();
    }
    findOneForAdmin(widgetId) {
        if (!mongoose_1.Types.ObjectId.isValid(widgetId)) {
            throw new common_1.BadRequestException('Invalid widget ID format');
        }
        return this.widgetsService.findById(widgetId);
    }
    async getWidgetScript(widgetId, res) {
        if (!mongoose_1.Types.ObjectId.isValid(widgetId)) {
            res.status(common_1.HttpStatus.BAD_REQUEST).send('Invalid widget ID format');
            return;
        }
        const widget = await this.widgetsService.findByIdPublic(widgetId);
        if (!widget) {
            res.status(common_1.HttpStatus.NOT_FOUND).send('Widget not found or not enabled.');
            return;
        }
        res.setHeader('Content-Type', 'application/javascript');
        res.send(`
      console.log("Widget script loader for widgetId: ${widgetId}");
      // Fetch public config and initialize UI
      (async () => {
        try {
          const response = await fetch('/widgets/${widgetId}/public-config');
          if (!response.ok) throw new Error('Failed to load widget config');
          const config = await response.json();
          console.log("Widget config:", config);
          // Example: Apply primary color
          if (config.widgetConfig && config.widgetConfig.primaryColor) {
            // document.documentElement.style.setProperty('--chat-widget-primary-color', config.widgetConfig.primaryColor);
          }
          // TODO: Implement actual widget UI initialization here
          // Connect to WebSocket, display chat button, etc.
        } catch (error) {
          console.error("Error loading widget:", error);
        }
      })();
    `);
    }
    async getWidgetPublicConfig(widgetId, res) {
        if (!mongoose_1.Types.ObjectId.isValid(widgetId)) {
            throw new common_1.BadRequestException('Invalid widget ID format');
        }
        const widgetPublicData = await this.widgetsService.findByIdPublic(widgetId);
        if (!widgetPublicData) {
            throw new common_1.NotFoundException('Widget not found or not enabled.');
        }
        const publicConfig = {
            widgetId: widgetPublicData._id?.toString() ?? '',
            name: widgetPublicData.name,
            departments: (widgetPublicData.departmentIds ?? []).map((dep) => ({
                id: dep._id.toString(),
                name: dep.name,
            })),
            widgetConfig: {
                primaryColor: widgetPublicData.primaryColor,
                welcomeMessage: widgetPublicData.welcomeMessage,
                headerText: widgetPublicData.headerText,
            },
            socketUrl: '/',
            socketNamespace: '/chat',
        };
        return res.status(common_1.HttpStatus.OK).json(publicConfig);
    }
    findOne(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid widget ID format');
        }
        return this.widgetsService.findById(id);
    }
    update(id, updateWidgetDto) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid widget ID format');
        }
        return this.widgetsService.update(id, updateWidgetDto);
    }
    remove(id) {
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid widget ID format');
        }
        return this.widgetsService.remove(id);
    }
};
exports.WidgetsController = WidgetsController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, user_decorator_1.AuthenticatedUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_widget_dto_1.CreateWidgetDto, Object]),
    __metadata("design:returntype", void 0)
], WidgetsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WidgetsController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    (0, common_1.Get)(':widgetId/config'),
    __param(0, (0, common_1.Param)('widgetId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WidgetsController.prototype, "findOneForAdmin", null);
__decorate([
    (0, common_1.Get)(':widgetId/script.js'),
    __param(0, (0, common_1.Param)('widgetId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WidgetsController.prototype, "getWidgetScript", null);
__decorate([
    (0, common_1.Get)(':widgetId/public-config'),
    __param(0, (0, common_1.Param)('widgetId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], WidgetsController.prototype, "getWidgetPublicConfig", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WidgetsController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_widget_dto_1.UpdateWidgetDto]),
    __metadata("design:returntype", void 0)
], WidgetsController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(enums_1.UserRole.ADMIN),
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WidgetsController.prototype, "remove", null);
exports.WidgetsController = WidgetsController = __decorate([
    (0, common_1.Controller)('widgets'),
    __metadata("design:paramtypes", [widgets_service_1.WidgetsService])
], WidgetsController);
//# sourceMappingURL=widgets.controller.js.map