"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const agent_profile_schema_1 = require("../schemas/agent-profile.schema");
const agents_service_1 = require("./agents.service");
const agents_controller_1 = require("./agents.controller");
const users_module_1 = require("../users/users.module");
const departments_module_1 = require("../departments/departments.module");
const chat_module_1 = require("../chat/chat.module");
let AgentsModule = class AgentsModule {
};
exports.AgentsModule = AgentsModule;
exports.AgentsModule = AgentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: agent_profile_schema_1.AgentProfile.name, schema: agent_profile_schema_1.AgentProfileSchema },
            ]),
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            departments_module_1.DepartmentsModule,
            (0, common_1.forwardRef)(() => chat_module_1.ChatModule),
        ],
        controllers: [agents_controller_1.AgentsController],
        providers: [agents_service_1.AgentsService],
        exports: [agents_service_1.AgentsService, mongoose_1.MongooseModule],
    })
], AgentsModule);
//# sourceMappingURL=agents.module.js.map