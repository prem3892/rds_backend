"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const chat_controller_1 = require("./chat.controller");
const auth_module_1 = require("../auth/auth.module");
const users_module_1 = require("../users/users.module");
const agents_module_1 = require("../agents/agents.module");
const customers_module_1 = require("../customers/customers.module");
const widgets_module_1 = require("../widgets/widgets.module");
const departments_module_1 = require("../departments/departments.module");
const config_1 = require("@nestjs/config");
const appointments_module_1 = require("../appointments/appointments.module");
const chat_session_schema_1 = require("../schemas/chat-session.schema");
const chat_message_schema_1 = require("../schemas/chat-message.schema");
const chat_gateway_1 = require("./chat.gateway");
const chat_session_service_1 = require("./services/chat-session/chat-session.service");
const chat_message_service_1 = require("./services/chat-message/chat-message.service");
const chat_notification_service_1 = require("./services/chat-notification/chat-notification.service");
let ChatModule = class ChatModule {
};
exports.ChatModule = ChatModule;
exports.ChatModule = ChatModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: chat_session_schema_1.ChatSession.name, schema: chat_session_schema_1.ChatSessionSchema },
                { name: chat_message_schema_1.ChatMessage.name, schema: chat_message_schema_1.ChatMessageSchema },
            ]),
            config_1.ConfigModule,
            (0, common_1.forwardRef)(() => auth_module_1.AuthModule),
            (0, common_1.forwardRef)(() => users_module_1.UsersModule),
            (0, common_1.forwardRef)(() => agents_module_1.AgentsModule),
            customers_module_1.CustomersModule,
            widgets_module_1.WidgetsModule,
            departments_module_1.DepartmentsModule,
            (0, common_1.forwardRef)(() => appointments_module_1.AppointmentsModule),
        ],
        providers: [
            chat_gateway_1.ChatGateway,
            chat_session_service_1.ChatSessionService,
            chat_message_service_1.ChatMessageService,
            chat_notification_service_1.ChatNotificationService,
        ],
        controllers: [chat_controller_1.ChatController],
        exports: [
            chat_session_service_1.ChatSessionService,
            chat_message_service_1.ChatMessageService,
            chat_notification_service_1.ChatNotificationService,
            chat_gateway_1.ChatGateway,
            mongoose_1.MongooseModule,
        ],
    })
], ChatModule);
//# sourceMappingURL=chat.module.js.map