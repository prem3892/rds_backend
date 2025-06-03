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
exports.WidgetsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const widget_schema_1 = require("../schemas/widget.schema");
const departments_service_1 = require("../departments/departments.service");
const config_1 = require("@nestjs/config");
let WidgetsService = class WidgetsService {
    widgetModel;
    departmentsService;
    configService;
    appDomain;
    constructor(widgetModel, departmentsService, configService) {
        this.widgetModel = widgetModel;
        this.departmentsService = departmentsService;
        this.configService = configService;
        this.appDomain =
            this.configService.get('appDomain') || 'http://localhost:8081';
    }
    generateInjectableScriptUrl(widgetId) {
        return `https://${this.appDomain}/widgets/${widgetId.toString()}/script.js`;
    }
    async create(createWidgetDto, adminId) {
        if (createWidgetDto.departmentIds &&
            createWidgetDto.departmentIds.length > 0) {
            const departments = await this.departmentsService.findByIds(createWidgetDto.departmentIds);
            if (departments.length !== createWidgetDto.departmentIds.length) {
                throw new common_1.BadRequestException('One or more department IDs are invalid.');
            }
        }
        const newWidget = new this.widgetModel({
            ...createWidgetDto,
            createdBy: adminId,
        });
        newWidget.injectableScriptUrl = this.generateInjectableScriptUrl(newWidget._id);
        return newWidget.save();
    }
    async findAll() {
        return this.widgetModel.find().populate('departmentIds').exec();
    }
    async findById(id) {
        const widget = await this.widgetModel
            .findById(id)
            .populate('departmentIds')
            .exec();
        if (!widget) {
            throw new common_1.NotFoundException(`Widget with ID ${id} not found`);
        }
        return widget;
    }
    async findByIdPublic(id) {
        const widget = await this.widgetModel
            .findById(id)
            .select('name domains departmentIds isEnabled primaryColor welcomeMessage headerText injectableScriptUrl')
            .populate({ path: 'departmentIds', select: 'name _id' })
            .exec();
        if (!widget || !widget.isEnabled) {
            return null;
        }
        return widget;
    }
    async update(id, updateWidgetDto) {
        const widget = await this.findById(id);
        if (updateWidgetDto.departmentIds &&
            updateWidgetDto.departmentIds.length > 0) {
            const departments = await this.departmentsService.findByIds(updateWidgetDto.departmentIds);
            if (departments.length !== updateWidgetDto.departmentIds.length) {
                throw new common_1.BadRequestException('One or more department IDs are invalid.');
            }
        }
        const updatedWidget = await this.widgetModel
            .findByIdAndUpdate(id, { ...updateWidgetDto }, { new: true })
            .populate('departmentIds')
            .exec();
        if (!updatedWidget) {
            throw new common_1.NotFoundException(`Widget with ID ${id} not found for update.`);
        }
        return updatedWidget;
    }
    async remove(id) {
        const deletedWidget = await this.widgetModel.findByIdAndDelete(id).exec();
        if (!deletedWidget) {
            throw new common_1.NotFoundException(`Widget with ID ${id} not found`);
        }
        return deletedWidget;
    }
};
exports.WidgetsService = WidgetsService;
exports.WidgetsService = WidgetsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(widget_schema_1.Widget.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        departments_service_1.DepartmentsService,
        config_1.ConfigService])
], WidgetsService);
//# sourceMappingURL=widgets.service.js.map