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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionSchema = exports.ChatSession = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enums_1 = require("../shared/constants/enums");
let ChatSession = class ChatSession {
    _id;
    widgetId;
    customerId;
    agentId;
    departmentId;
    status;
    initiatedAt;
    acceptedAt;
    endedAt;
    lastMessageAt;
    customerLastSeen;
    agentLastSeen;
    initialMessage;
    domain;
    priorityNotificationSentCount;
    lastPriorityNotificationSentAt;
};
exports.ChatSession = ChatSession;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Widget', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatSession.prototype, "widgetId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Customer', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatSession.prototype, "customerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', index: true, default: null }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatSession.prototype, "agentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Department', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], ChatSession.prototype, "departmentId", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: enums_1.ChatSessionStatus,
        default: enums_1.ChatSessionStatus.PENDING_ASSIGNMENT,
        index: true,
    }),
    __metadata("design:type", String)
], ChatSession.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], ChatSession.prototype, "initiatedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", Date)
], ChatSession.prototype, "acceptedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", Date)
], ChatSession.prototype, "endedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ChatSession.prototype, "lastMessageAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ChatSession.prototype, "customerLastSeen", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ChatSession.prototype, "agentLastSeen", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true }),
    __metadata("design:type", String)
], ChatSession.prototype, "initialMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ChatSession.prototype, "domain", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ChatSession.prototype, "priorityNotificationSentCount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ChatSession.prototype, "lastPriorityNotificationSentAt", void 0);
exports.ChatSession = ChatSession = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], ChatSession);
exports.ChatSessionSchema = mongoose_1.SchemaFactory.createForClass(ChatSession);
//# sourceMappingURL=chat-session.schema.js.map