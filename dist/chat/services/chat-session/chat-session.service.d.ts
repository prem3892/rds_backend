import { Model, Types } from 'mongoose';
import { ChatSessionDocument } from 'src/schemas/chat-session.schema';
import { ChatSessionStatus } from 'src/shared/constants/enums';
import { AgentsService } from 'src/agents/agents.service';
import { CustomersService } from 'src/customers/customers.service';
import { InitiateChatDto } from 'src/chat/dto/initiate-chat.dto';
import { WidgetsService } from 'src/widgets/widgets.service';
import { DepartmentsService } from 'src/departments/departments.service';
import { CustomerDocument } from 'src/schemas/customer.schema';
import { GetChatSessionsQueryDto } from 'src/chat/dto/get-chat-session.dto';
export declare class ChatSessionService {
    private chatSessionModel;
    private readonly agentsService;
    private readonly customersService;
    private readonly widgetsService;
    private readonly departmentsService;
    private readonly logger;
    constructor(chatSessionModel: Model<ChatSessionDocument>, agentsService: AgentsService, customersService: CustomersService, widgetsService: WidgetsService, departmentsService: DepartmentsService);
    findById(id: string | Types.ObjectId): Promise<ChatSessionDocument | null>;
    findByIdOrFail(id: string | Types.ObjectId): Promise<ChatSessionDocument>;
    initiateChat(dto: InitiateChatDto, domain: string, customer: CustomerDocument): Promise<{
        session: ChatSessionDocument;
        wasNew: boolean;
    }>;
    acceptChat(chatSessionId: string, agentId: string): Promise<ChatSessionDocument | null>;
    updateSessionStatus(sessionId: string | Types.ObjectId, status: ChatSessionStatus, endedAt?: Date): Promise<ChatSessionDocument>;
    countActiveChatsForAgent(agentId: Types.ObjectId): Promise<number>;
    getActiveSessionsForAgent(agentId: string): Promise<ChatSessionDocument[]>;
    getPendingAssignmentSessions(firstAlertThresholdMs: number, subsequentAlertIntervalMs: number, maxPriorityAlerts: number): Promise<ChatSessionDocument[]>;
    getExpiredPendingSessions(subsequentAlertIntervalMs: number, maxPriorityAlerts: number): Promise<ChatSessionDocument[]>;
    incrementPriorityNotificationCount(sessionId: Types.ObjectId): Promise<ChatSessionDocument | null>;
    updateLastMessageTimestamp(sessionId: string | Types.ObjectId, timestamp?: Date): Promise<void>;
    updateCustomerLastSeen(sessionId: string | Types.ObjectId, timestamp?: Date): Promise<void>;
    updateAgentLastSeen(sessionId: string | Types.ObjectId, timestamp?: Date): Promise<void>;
    findAllPaginated(queryDto: GetChatSessionsQueryDto): Promise<{
        data: ChatSessionDocument[];
        total: number;
    }>;
    getSessionsForAgentReconnect(agentId: Types.ObjectId): Promise<ChatSessionDocument[]>;
    getSessionsForCustomerReconnect(customerId: Types.ObjectId): Promise<ChatSessionDocument[]>;
}
