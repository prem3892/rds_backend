import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { ChatSessionService } from './services/chat-session/chat-session.service';
import { ChatMessageService } from './services/chat-message/chat-message.service';
import { AgentsService } from '../agents/agents.service';
import { CustomersService } from '../customers/customers.service';
import { WidgetsService } from '../widgets/widgets.service';
import { DepartmentsService } from '../departments/departments.service';
import { RedisService } from '../shared/redis/redis.service';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { InitiateChatDto } from './dto/initiate-chat.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConnectWidgetDto } from './dto/connect-widget.dto';
import { ChatSessionDocument } from 'src/schemas/chat-session.schema';
import { AppointmentsService } from 'src/appointments/appointments.service';
import { UsersService } from '../users/users.service';
import { CreateAppointmentDto } from 'src/appointments/dto/create-appointment.dto';
import { AppointmentDocument } from 'src/schemas/appointment.schema';
interface AuthenticatedSocket extends Socket {
    user?: JwtPayload;
    customerId?: string;
}
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly authService;
    private readonly chatSessionService;
    private readonly chatMessageService;
    private readonly agentsService;
    private readonly customersService;
    private readonly widgetsService;
    private readonly departmentsService;
    private readonly redisService;
    private readonly configService;
    private readonly appointmentsService;
    private readonly usersService;
    server: Server;
    private readonly logger;
    private readonly agentReconnectTimeoutMs;
    private readonly customerReconnectTimeoutMs;
    private readonly customerAbandonTimeoutMs;
    constructor(authService: AuthService, chatSessionService: ChatSessionService, chatMessageService: ChatMessageService, agentsService: AgentsService, customersService: CustomersService, widgetsService: WidgetsService, departmentsService: DepartmentsService, redisService: RedisService, configService: ConfigService, appointmentsService: AppointmentsService, usersService: UsersService);
    afterInit(server: Server): void;
    handleConnection(client: AuthenticatedSocket, ...args: any[]): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): Promise<void>;
    private handleAgentDisconnect;
    private scheduleAgentReconnectTimeout;
    private handleCustomerDisconnect;
    private scheduleCustomerReconnectTimeout;
    handleAgentAuthenticate(data: {
        token: string;
    }, client: AuthenticatedSocket): Promise<{
        event: string;
        data: any;
    }>;
    handleAgentSetOnlineStatus(data: {
        isOnline: boolean;
    }, client: AuthenticatedSocket): Promise<{
        event: string;
        data: {
            isOnline: boolean;
        };
    }>;
    private broadcastAgentPoolStatusUpdateForAgent;
    handleAgentAcceptChat(data: {
        chatSessionId: string;
    }, client: AuthenticatedSocket): Promise<{
        event: string;
        data: {
            chatSessionId: string;
            success: boolean;
        };
    }>;
    handleAgentSendMessage(payload: SendMessageDto, client: AuthenticatedSocket): Promise<{
        event: string;
        data: any;
    }>;
    handleAgentEndChat(data: {
        chatSessionId: string;
        reason?: string;
    }, client: AuthenticatedSocket): Promise<{
        event: string;
        data: {
            chatSessionId: string;
        };
    }>;
    handleAgentResolveChat(data: {
        chatSessionId: string;
    }, client: AuthenticatedSocket): Promise<{
        event: string;
        data: {
            chatSessionId: string;
        };
    }>;
    handleCustomerConnectWidget(payload: ConnectWidgetDto, client: AuthenticatedSocket): Promise<{
        event: string;
        data: any;
    }>;
    handleCustomerInitiateChat(payload: InitiateChatDto, client: AuthenticatedSocket): Promise<{
        event: string;
        data: {
            chatSessionId: string;
            status: string;
        };
    }>;
    handleCustomerSendMessage(payload: SendMessageDto, client: AuthenticatedSocket): Promise<{
        event: string;
        data: any;
    }>;
    handleTypingStart(data: {
        chatSessionId: string;
    }, client: AuthenticatedSocket): Promise<void>;
    handleTypingStop(data: {
        chatSessionId: string;
    }, client: AuthenticatedSocket): Promise<void>;
    handleCustomerMarkMessagesRead(data: {
        chatSessionId: string;
        lastMessageTimestamp?: string;
    }, client: AuthenticatedSocket): Promise<void>;
    handleAgentMarkMessagesRead(data: {
        chatSessionId: string;
        lastMessageTimestamp?: string;
    }, client: AuthenticatedSocket): Promise<void>;
    handleAgentBookAppointment(payload: CreateAppointmentDto, client: AuthenticatedSocket): Promise<{
        event: string;
        data: any;
    }>;
    private removeParticipantsFromChatRoom;
    sendPriorityChatNotification(agentId: string, session: ChatSessionDocument): void;
    notifyCustomerSessionExpired(customerId: string, session: ChatSessionDocument): void;
    emitSystemMessageToChat(chatSessionId: string, text: string, type?: 'INFO' | 'WARNING' | 'ERROR'): void;
    notifyAppointmentBooked(appointment: AppointmentDocument): void;
}
export {};
