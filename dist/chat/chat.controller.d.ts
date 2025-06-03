import { ChatMessageService } from './services/chat-message/chat-message.service';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { GetMessagesQueryDto } from './dto/get-messages.dto';
import { GetChatSessionsQueryDto } from './dto/get-chat-session.dto';
export declare class ChatController {
    private readonly chatMessageService;
    private readonly chatSessionService;
    constructor(chatMessageService: ChatMessageService, chatSessionService: ChatSessionService);
    getAllChatSessions(queryDto: GetChatSessionsQueryDto): Promise<{
        data: import("../schemas/chat-session.schema").ChatSessionDocument[];
        total: number;
    }>;
    getMyActiveSessions(user: JwtPayload): Promise<import("../schemas/chat-session.schema").ChatSessionDocument[]>;
    getMessagesForSession(sessionId: string, queryDto: GetMessagesQueryDto, user: JwtPayload): Promise<import("../schemas/chat-message.schema").ChatMessageDocument[]>;
}
