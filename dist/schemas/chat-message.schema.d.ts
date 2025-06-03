import { Document, Types } from 'mongoose';
import { ChatMessageSenderType, ChatMessageType } from 'src/shared/constants/enums';
export type ChatMessageDocument = ChatMessage & Document;
export declare class ChatMessage {
    _id: Types.ObjectId;
    chatSessionId: Types.ObjectId;
    senderId: Types.ObjectId;
    senderType: ChatMessageSenderType;
    messageType: ChatMessageType;
    content: Record<string, any>;
    timestamp: Date;
    readByAgent: boolean;
    readByCustomer: boolean;
}
export declare const ChatMessageSchema: import("mongoose").Schema<ChatMessage, import("mongoose").Model<ChatMessage, any, any, any, Document<unknown, any, ChatMessage, any> & ChatMessage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChatMessage, Document<unknown, {}, import("mongoose").FlatRecord<ChatMessage>, {}> & import("mongoose").FlatRecord<ChatMessage> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
