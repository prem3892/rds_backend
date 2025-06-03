"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WidgetsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const widget_schema_1 = require("../schemas/widget.schema");
const widgets_service_1 = require("./widgets.service");
const widgets_controller_1 = require("./widgets.controller");
const departments_module_1 = require("../departments/departments.module");
const config_1 = require("@nestjs/config");
let WidgetsModule = class WidgetsModule {
};
exports.WidgetsModule = WidgetsModule;
exports.WidgetsModule = WidgetsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: widget_schema_1.Widget.name, schema: widget_schema_1.WidgetSchema }]),
            departments_module_1.DepartmentsModule,
            config_1.ConfigModule,
        ],
        controllers: [widgets_controller_1.WidgetsController],
        providers: [widgets_service_1.WidgetsService],
        exports: [widgets_service_1.WidgetsService, mongoose_1.MongooseModule],
    })
], WidgetsModule);
//# sourceMappingURL=widgets.module.js.map