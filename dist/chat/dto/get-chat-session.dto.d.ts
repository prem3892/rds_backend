import { ChatSessionStatus } from '../../shared/constants/enums';
export declare class GetChatSessionsQueryDto {
    limit?: number;
    page?: number;
    status?: ChatSessionStatus;
    agentId?: string;
    departmentId?: string;
    customerName?: string;
    customerEmail?: string;
}
