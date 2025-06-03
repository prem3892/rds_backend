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
exports.ChatMessageService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const chat_message_schema_1 = require("../../../schemas/chat-message.schema");
const enums_1 = require("../../../shared/constants/enums");
let ChatMessageService = class ChatMessageService {
    chatMessageModel;
    constructor(chatMessageModel) {
        this.chatMessageModel = chatMessageModel;
    }
    async createMessage(payload) {
        const newMessage = new this.chatMessageModel({
            ...payload,
            chatSessionId: new mongoose_2.Types.ObjectId(payload.chatSessionId),
            senderId: new mongoose_2.Types.ObjectId(payload.senderId),
        });
        return newMessage.save();
    }
    async getMessagesForSession(chatSessionId, limit = 50, page = 1) {
        if (!mongoose_2.Types.ObjectId.isValid(chatSessionId)) {
            throw new common_1.BadRequestException('Invalid chat session ID format');
        }
        const skip = (page - 1) * limit;
        return this.chatMessageModel
            .find({ chatSessionId: new mongoose_2.Types.ObjectId(chatSessionId) })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .exec();
    }
    async markMessagesAsReadByAgent(chatSessionId, upToTimestamp) {
        const filter = {
            chatSessionId: new mongoose_2.Types.ObjectId(chatSessionId),
            senderType: enums_1.ChatMessageSenderType.CUSTOMER,
            readByAgent: false,
        };
        if (upToTimestamp) {
            filter.timestamp = { $lte: upToTimestamp };
        }
        await this.chatMessageModel
            .updateMany(filter, { $set: { readByAgent: true } })
            .exec();
    }
    async markMessagesAsReadByCustomer(chatSessionId, upToTimestamp) {
        const filter = {
            chatSessionId: new mongoose_2.Types.ObjectId(chatSessionId),
            senderType: enums_1.ChatMessageSenderType.AGENT,
            readByCustomer: false,
        };
        if (upToTimestamp) {
            filter.timestamp = { $lte: upToTimestamp };
        }
        await this.chatMessageModel
            .updateMany(filter, { $set: { readByCustomer: true } })
            .exec();
    }
};
exports.ChatMessageService = ChatMessageService;
exports.ChatMessageService = ChatMessageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(chat_message_schema_1.ChatMessage.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ChatMessageService);
//# sourceMappingURL=chat-message.service.js.map