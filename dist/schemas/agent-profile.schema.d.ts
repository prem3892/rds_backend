import { Document, Types } from 'mongoose';
export type AgentProfileDocument = AgentProfile & Document;
export declare class AgentProfile {
    userId: Types.ObjectId;
    departmentIds: Types.ObjectId[];
    domainAccess: string[];
    isOnline: boolean;
    maxConcurrentChats: number;
    lastSeen?: Date;
}
export declare const AgentProfileSchema: import("mongoose").Schema<AgentProfile, import("mongoose").Model<AgentProfile, any, any, any, Document<unknown, any, AgentProfile, any> & AgentProfile & {
    _id: Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, AgentProfile, Document<unknown, {}, import("mongoose").FlatRecord<AgentProfile>, {}> & import("mongoose").FlatRecord<AgentProfile> & {
    _id: Types.ObjectId;
} & {
    __v: number;
}>;
