import { Types } from 'mongoose';
export declare class UpdateAgentProfileDto {
    departmentIds?: Types.ObjectId[];
    domainAccess?: string[];
    isOnline?: boolean;
    maxConcurrentChats?: number;
}
