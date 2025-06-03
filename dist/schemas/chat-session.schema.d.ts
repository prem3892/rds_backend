import { Document, Types } from 'mongoose';
import { ChatSessionStatus } from 'src/shared/constants/enums';
export type ChatSessionDocument = ChatSession & Document;
export declare class ChatSession {
    _id: Types.ObjectId;
    widgetId: Types.ObjectId;
    customerId: Types.ObjectId;
    agentId?: Types.ObjectId;
    departmentId: Types.ObjectId;
    status: ChatSessionStatus;
    initiatedAt: Date;
    acceptedAt?: Date;
    endedAt?: Date;
    lastMessageAt?: Date;
    customerLastSeen?: Date;
    agentLastSeen?: Date;
    initialMessage: string;
    domain: string;
    priorityNotificationSentCount: number;
    lastPriorityNotificationSentAt?: Date;
}
export declare const ChatSessionSchema: import("mongoose").Schema<ChatSession, import("mongoose").Model<ChatSession, any, any, any, Document<unknown, any, ChatSession, any> & ChatSession & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ChatSession, Document<unknown, {}, import("mongoose").FlatRecord<ChatSession>, {}> & import("mongoose").FlatRecord<ChatSession> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
