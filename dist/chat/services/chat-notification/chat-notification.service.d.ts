import { ConfigService } from '@nestjs/config';
import { ChatGateway } from 'src/chat/chat.gateway';
import { ChatSessionService } from '../chat-session/chat-session.service';
import { AgentsService } from 'src/agents/agents.service';
export declare class ChatNotificationService {
    private readonly chatSessionService;
    private readonly agentsService;
    private readonly chatGateway;
    private readonly configService;
    private readonly logger;
    private readonly firstAlertThresholdMs;
    private readonly subsequentAlertIntervalMs;
    private readonly maxPriorityAlerts;
    constructor(chatSessionService: ChatSessionService, agentsService: AgentsService, chatGateway: ChatGateway, configService: ConfigService);
    handleUnattendedChatNotifications(): Promise<void>;
}
