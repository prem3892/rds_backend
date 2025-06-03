import { Model, Types } from 'mongoose';
import { ChatMessageDocument } from 'src/schemas/chat-message.schema';
import { ChatMessageSenderType, ChatMessageType } from 'src/shared/constants/enums';
interface CreateMessagePayload {
    chatSessionId: Types.ObjectId | string;
    senderId: Types.ObjectId | string;
    senderType: ChatMessageSenderType;
    messageType: ChatMessageType;
    content: Record<string, any>;
}
export declare class ChatMessageService {
    private chatMessageModel;
    constructor(chatMessageModel: Model<ChatMessageDocument>);
    createMessage(payload: CreateMessagePayload): Promise<ChatMessageDocument>;
    getMessagesForSession(chatSessionId: string, limit?: number, page?: number): Promise<ChatMessageDocument[]>;
    markMessagesAsReadByAgent(chatSessionId: string, upToTimestamp?: Date): Promise<void>;
    markMessagesAsReadByCustomer(chatSessionId: string, upToTimestamp?: Date): Promise<void>;
}
export {};
