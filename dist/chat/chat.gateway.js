"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("../auth/auth.service");
const chat_session_service_1 = require("./services/chat-session/chat-session.service");
const chat_message_service_1 = require("./services/chat-message/chat-message.service");
const agents_service_1 = require("../agents/agents.service");
const customers_service_1 = require("../customers/customers.service");
const widgets_service_1 = require("../widgets/widgets.service");
const departments_service_1 = require("../departments/departments.service");
const redis_service_1 = require("../shared/redis/redis.service");
const enums_1 = require("../shared/constants/enums");
const initiate_chat_dto_1 = require("./dto/initiate-chat.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
const connect_widget_dto_1 = require("./dto/connect-widget.dto");
const mongoose_1 = require("mongoose");
const all_exceptions_filter_1 = require("../shared/filters/all-exceptions.filter");
const appointments_service_1 = require("../appointments/appointments.service");
const users_service_1 = require("../users/users.service");
const create_appointment_dto_1 = require("../appointments/dto/create-appointment.dto");
let ChatGateway = ChatGateway_1 = class ChatGateway {
    authService;
    chatSessionService;
    chatMessageService;
    agentsService;
    customersService;
    widgetsService;
    departmentsService;
    redisService;
    configService;
    appointmentsService;
    usersService;
    server;
    logger = new common_1.Logger(ChatGateway_1.name);
    agentReconnectTimeoutMs;
    customerReconnectTimeoutMs;
    customerAbandonTimeoutMs;
    constructor(authService, chatSessionService, chatMessageService, agentsService, customersService, widgetsService, departmentsService, redisService, configService, appointmentsService, usersService) {
        this.authService = authService;
        this.chatSessionService = chatSessionService;
        this.chatMessageService = chatMessageService;
        this.agentsService = agentsService;
        this.customersService = customersService;
        this.widgetsService = widgetsService;
        this.departmentsService = departmentsService;
        this.redisService = redisService;
        this.configService = configService;
        this.appointmentsService = appointmentsService;
        this.usersService = usersService;
        this.agentReconnectTimeoutMs =
            this.configService.get('chatTimers.agentReconnectTimeoutMs') ||
                600000;
        this.customerReconnectTimeoutMs =
            this.configService.get('chatTimers.customerReconnectTimeoutMs') ||
                600000;
        this.customerAbandonTimeoutMs =
            this.configService.get('chatTimers.customerAbandonTimeoutMs') ||
                600000;
    }
    afterInit(server) {
        this.logger.log('ChatGateway Initialized');
    }
    async handleConnection(client, ...args) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    async handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const agentId = await this.redisService.getAgentIdBySocketId(client.id);
        if (agentId) {
            this.logger.log(`Agent ${agentId} disconnected with socket ${client.id}`);
            await this.handleAgentDisconnect(client, agentId);
        }
        const customerId = await this.redisService.getCustomerIdBySocketId(client.id);
        if (customerId) {
            this.logger.log(`Customer ${customerId} disconnected with socket ${client.id}`);
            await this.handleCustomerDisconnect(client, customerId);
        }
    }
    async handleAgentDisconnect(client, agentId) {
        await this.redisService.removeAgentSocketMapping(client.id, agentId);
        const stillConnectedSocketId = await this.redisService.getSocketIdByAgentId(agentId);
        if (!stillConnectedSocketId || stillConnectedSocketId === client.id) {
            const agentProfile = await this.agentsService.setOnlineStatus(agentId, false);
            this.logger.log(`Agent ${agentId} marked as offline.`);
            client.leave(`agent:${agentId}`);
            client.leave('online_agents');
            this.broadcastAgentPoolStatusUpdateForAgent(agentProfile);
            const activeSessions = await this.chatSessionService.getActiveSessionsForAgent(agentId);
            for (const session of activeSessions) {
                await this.chatSessionService.updateSessionStatus(session._id, enums_1.ChatSessionStatus.PENDING_AGENT_RECONNECT);
                this.server
                    .to(`customer:${session.customerId.toString()}`)
                    .emit('server:agent_disconnected_from_chat', {
                    chatSessionId: session._id.toString(),
                    agentName: agentProfile?.userId
                        ? (await this.usersService.findById(agentProfile.userId))
                            ?.firstName
                        : 'Agent',
                });
                await this.redisService.set(`${enums_1.REDIS_AGENT_RECONNECT_PENDING_PREFIX}${session._id.toString()}`, agentId, this.agentReconnectTimeoutMs / 1000);
                this.scheduleAgentReconnectTimeout(session._id.toString(), agentId, this.agentReconnectTimeoutMs);
                this.logger.log(`Session ${session._id} set to PENDING_AGENT_RECONNECT for agent ${agentId}. Reconnect timer started.`);
            }
        }
        else {
            this.logger.log(`Agent ${agentId} has other active sockets. Not marking offline. Socket ${client.id} removed.`);
        }
    }
    scheduleAgentReconnectTimeout(sessionId, agentId, timeoutMs) {
        setTimeout(async () => {
            const stillPending = await this.redisService.get(`${enums_1.REDIS_AGENT_RECONNECT_PENDING_PREFIX}${sessionId}`);
            if (stillPending === agentId) {
                this.logger.log(`Agent ${agentId} did not reconnect for session ${sessionId}. Abandoning.`);
                const session = await this.chatSessionService.findById(sessionId);
                if (session &&
                    session.status === enums_1.ChatSessionStatus.PENDING_AGENT_RECONNECT) {
                    const updatedSession = await this.chatSessionService.updateSessionStatus(sessionId, enums_1.ChatSessionStatus.ABANDONED_BY_AGENT);
                    this.server
                        .to(`customer:${session.customerId.toString()}`)
                        .emit('server:chat_session_update', {
                        chatSessionId: sessionId,
                        status: enums_1.ChatSessionStatus.ABANDONED_BY_AGENT,
                        message: 'The agent was disconnected and could not reconnect. You may try starting a new chat or leave an offline message.',
                    });
                }
                await this.redisService.del(`${enums_1.REDIS_AGENT_RECONNECT_PENDING_PREFIX}${sessionId}`);
            }
        }, timeoutMs);
    }
    async handleCustomerDisconnect(client, customerId) {
        await this.redisService.removeCustomerSocketMapping(client.id, customerId);
        client.leave(`customer:${customerId}`);
        const sessions = await this.chatSessionService.getSessionsForCustomerReconnect(new mongoose_1.Types.ObjectId(customerId));
        for (const session of sessions) {
            await this.chatSessionService.updateCustomerLastSeen(session._id);
            if (session.agentId) {
                const customer = await this.customersService.findById(customerId);
                this.server
                    .to(`agent:${session.agentId.toString()}`)
                    .emit('server:customer_disconnected_from_chat', {
                    chatSessionId: session._id.toString(),
                    customerName: customer?.name || 'Customer',
                });
            }
            await this.redisService.set(`${enums_1.REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${session._id.toString()}`, customerId, this.customerReconnectTimeoutMs / 1000);
            this.scheduleCustomerReconnectTimeout(session._id.toString(), customerId, this.customerReconnectTimeoutMs, this.customerAbandonTimeoutMs);
            this.logger.log(`Customer ${customerId} disconnected from session ${session._id}. Reconnect timer started.`);
        }
    }
    scheduleCustomerReconnectTimeout(sessionId, customerId, reconnectTimeoutMs, abandonTimeoutMs) {
        setTimeout(async () => {
            const stillPendingReconnect = await this.redisService.get(`${enums_1.REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${sessionId}`);
            if (stillPendingReconnect === customerId) {
                this.logger.log(`Customer ${customerId} reconnect timer expired for session ${sessionId}. Awaiting abandon timeout.`);
                setTimeout(async () => {
                    const session = await this.chatSessionService.findById(sessionId);
                    if (session &&
                        (session.status === enums_1.ChatSessionStatus.ACTIVE ||
                            session.status === enums_1.ChatSessionStatus.PENDING_AGENT_RECONNECT)) {
                        if (session.customerLastSeen &&
                            new Date().getTime() - session.customerLastSeen.getTime() >=
                                abandonTimeoutMs) {
                            this.logger.log(`Customer ${customerId} abandon timeout reached for session ${sessionId}. Marking as abandoned.`);
                            const updatedSession = await this.chatSessionService.updateSessionStatus(sessionId, enums_1.ChatSessionStatus.ABANDONED_BY_CUSTOMER);
                            if (updatedSession.agentId) {
                                this.server
                                    .to(`agent:${updatedSession.agentId.toString()}`)
                                    .emit('server:chat_session_update', {
                                    chatSessionId: sessionId,
                                    status: enums_1.ChatSessionStatus.ABANDONED_BY_CUSTOMER,
                                    message: 'The customer was disconnected for an extended period and the chat has been marked as abandoned.',
                                });
                            }
                        }
                    }
                    await this.redisService.del(`${enums_1.REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${sessionId}`);
                }, abandonTimeoutMs - reconnectTimeoutMs);
            }
        }, reconnectTimeoutMs);
    }
    async handleAgentAuthenticate(data, client) {
        if (!data.token) {
            throw new websockets_1.WsException('Authentication token not provided.');
        }
        const jwtPayload = await this.authService.validateSocketToken(data.token);
        if (!jwtPayload ||
            (jwtPayload.role !== enums_1.UserRole.ADMIN && jwtPayload.role !== enums_1.UserRole.AGENT)) {
            this.logger.warn(`Agent authentication failed for socket ${client.id}. Invalid token or role.`);
            client.emit('server:auth_failed', { message: 'Authentication failed.' });
            client.disconnect(true);
            throw new websockets_1.WsException('Authentication failed.');
        }
        client.user = jwtPayload;
        await this.redisService.mapSocketIdToAgentId(client.id, jwtPayload.sub);
        client.join(`agent:${jwtPayload.sub}`);
        this.logger.log(`Agent ${jwtPayload.sub} (${jwtPayload.email}) authenticated with socket ${client.id}`);
        const reconnectSessions = await this.chatSessionService.getSessionsForAgentReconnect(new mongoose_1.Types.ObjectId(jwtPayload.sub));
        for (const session of reconnectSessions) {
            this.logger.log(`Agent ${jwtPayload.sub} reconnected. Restoring session ${session._id}.`);
            await this.redisService.del(`${enums_1.REDIS_AGENT_RECONNECT_PENDING_PREFIX}${session._id.toString()}`);
            const updatedSession = await this.chatSessionService.updateSessionStatus(session._id, enums_1.ChatSessionStatus.ACTIVE);
            await this.chatSessionService.updateAgentLastSeen(session._id);
            client.join(`chatSession:${session._id.toString()}`);
            const customerSocketId = await this.redisService.getSocketIdByCustomerId(session.customerId.toString());
            if (customerSocketId) {
                const customerClient = this.server.sockets.sockets.get(customerSocketId);
                if (customerClient)
                    customerClient.join(`chatSession:${session._id.toString()}`);
            }
            this.server
                .to(`customer:${session.customerId.toString()}`)
                .emit('server:agent_reconnected_to_chat', {
                chatSessionId: session._id.toString(),
                agentName: jwtPayload.email,
            });
            this.server
                .to(`agent:${jwtPayload.sub}`)
                .emit('server:chat_session_restored', updatedSession);
        }
        return {
            event: 'server:authenticated',
            data: { userId: jwtPayload.sub, role: jwtPayload.role },
        };
    }
    async handleAgentSetOnlineStatus(data, client) {
        if (!client.user)
            throw new websockets_1.WsException('Agent not authenticated.');
        if (typeof data.isOnline !== 'boolean')
            throw new websockets_1.WsException('Invalid payload for online status.');
        const agentProfile = await this.agentsService.setOnlineStatus(client.user.sub, data.isOnline);
        this.logger.log(`Agent ${client.user.sub} set online status to ${data.isOnline}`);
        if (data.isOnline) {
            client.join('online_agents');
        }
        else {
            client.leave('online_agents');
        }
        this.broadcastAgentPoolStatusUpdateForAgent(agentProfile);
        return {
            event: 'server:online_status_updated',
            data: { isOnline: agentProfile.isOnline },
        };
    }
    async broadcastAgentPoolStatusUpdateForAgent(agentProfile) {
        if (!agentProfile ||
            !agentProfile.departmentIds ||
            !Array.isArray(agentProfile.departmentIds) ||
            !agentProfile.domainAccess ||
            !Array.isArray(agentProfile.domainAccess)) {
            this.logger.warn(`Cannot broadcast agent pool status update: invalid agent profile data`, {
                hasProfile: !!agentProfile,
                hasDepartmentIds: !!agentProfile?.departmentIds,
                isDepartmentIdsArray: Array.isArray(agentProfile?.departmentIds),
                hasDomainAccess: !!agentProfile?.domainAccess,
                isDomainAccessArray: Array.isArray(agentProfile?.domainAccess),
            });
            return;
        }
        for (const deptId of agentProfile.departmentIds) {
            for (const domain of agentProfile.domainAccess) {
                try {
                    const onlineAgents = await this.agentsService.getEligibleOnlineAgents(new mongoose_1.Types.ObjectId(deptId), domain);
                    this.server.to('/chat').emit('server:agent_pool_status_update', {
                        departmentId: deptId.toString(),
                        domain: domain,
                        onlineAgentsCount: onlineAgents.length,
                        isAvailable: onlineAgents.length > 0,
                    });
                    this.logger.log(`Broadcasted agent pool status update for dept ${deptId} domain ${domain}: ${onlineAgents.length} agents available`);
                }
                catch (error) {
                    this.logger.error(`Failed to broadcast agent pool status update for dept ${deptId} domain ${domain}`, error);
                }
            }
        }
    }
    async handleAgentAcceptChat(data, client) {
        if (!client.user)
            throw new websockets_1.WsException('Agent not authenticated.');
        if (!data.chatSessionId || !mongoose_1.Types.ObjectId.isValid(data.chatSessionId)) {
            throw new websockets_1.WsException('Invalid chatSessionId.');
        }
        const agentId = client.user.sub;
        const agentProfile = await this.agentsService.findAgentProfileByUserIdOrFail(agentId);
        const activeChats = await this.chatSessionService.countActiveChatsForAgent(new mongoose_1.Types.ObjectId(agentId));
        if (activeChats >= agentProfile.maxConcurrentChats) {
            this.logger.warn(`Agent ${agentId} attempted to accept chat ${data.chatSessionId} but reached max concurrent chats (${agentProfile.maxConcurrentChats}).`);
            client.emit('server:max_chats_reached', {
                chatSessionId: data.chatSessionId,
                maxChats: agentProfile.maxConcurrentChats,
            });
            throw new websockets_1.WsException(`You have reached your maximum limit of ${agentProfile.maxConcurrentChats} concurrent chats.`);
        }
        const session = await this.chatSessionService.acceptChat(data.chatSessionId, agentId);
        if (session) {
            client.join(`chatSession:${session._id.toString()}`);
            const customerSocketId = await this.redisService.getSocketIdByCustomerId(session.customerId.toString());
            if (customerSocketId) {
                const customerClient = this.server.sockets.sockets.get(customerSocketId);
                if (customerClient) {
                    customerClient.join(`chatSession:${session._id.toString()}`);
                }
            }
            const agentUser = await this.usersService.findById(agentId);
            client.emit('server:chat_accepted_by_you', session);
            this.server
                .to(`customer:${session.customerId.toString()}`)
                .emit('server:agent_details_on_accept', {
                chatSessionId: session._id.toString(),
                agent: {
                    name: agentUser
                        ? `${agentUser.firstName} ${agentUser.lastName}`
                        : 'Support Agent',
                },
            });
            this.server
                .to('online_agents')
                .except(client.id)
                .emit('server:chat_taken_or_resolved', {
                chatSessionId: session._id.toString(),
            });
            const systemMessage = await this.chatMessageService.createMessage({
                chatSessionId: session._id,
                senderId: new mongoose_1.Types.ObjectId(agentId),
                senderType: enums_1.ChatMessageSenderType.SYSTEM,
                messageType: enums_1.ChatMessageType.TEXT,
                content: {
                    text: `${agentUser?.firstName || 'Agent'} has joined the chat.`,
                },
            });
            this.server
                .to(`chatSession:${session._id.toString()}`)
                .emit('server:new_message', systemMessage);
        }
        else {
            const existingSession = await this.chatSessionService.findById(data.chatSessionId);
            let acceptedByAgentName = 'another agent';
            if (existingSession && existingSession.agentId) {
                const acceptedAgentUser = await this.usersService.findById(existingSession.agentId._id);
                if (acceptedAgentUser)
                    acceptedByAgentName = `${acceptedAgentUser.firstName} ${acceptedAgentUser.lastName}`;
            }
            client.emit('server:chat_already_accepted', {
                chatSessionId: data.chatSessionId,
                acceptedByAgentName: acceptedByAgentName,
            });
            this.logger.warn(`Agent ${agentId} tried to accept chat ${data.chatSessionId}, but it was already taken or not available.`);
        }
        return {
            event: 'server:accept_chat_ack',
            data: { chatSessionId: data.chatSessionId, success: !!session },
        };
    }
    async handleAgentSendMessage(payload, client) {
        if (!client.user)
            throw new websockets_1.WsException('Agent not authenticated.');
        if (!payload.chatSessionId ||
            !mongoose_1.Types.ObjectId.isValid(payload.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        if (!payload.messageContent ||
            typeof payload.messageContent !== 'object' ||
            Object.keys(payload.messageContent).length === 0) {
            throw new websockets_1.WsException('Invalid message content.');
        }
        const session = await this.chatSessionService.findByIdOrFail(payload.chatSessionId);
        if (session.agentId?.toString() !== client.user.sub ||
            session.status !== enums_1.ChatSessionStatus.ACTIVE) {
            throw new websockets_1.WsException('Cannot send message to this session.');
        }
        let messageType = enums_1.ChatMessageType.TEXT;
        if (payload.messageContent.url &&
            (payload.messageContent.filename ||
                payload.messageContent.mimetype?.startsWith('image'))) {
            messageType = enums_1.ChatMessageType.IMAGE;
        }
        else if (payload.messageContent.url && payload.messageContent.filename) {
            messageType = enums_1.ChatMessageType.FILE;
        }
        const message = await this.chatMessageService.createMessage({
            chatSessionId: session._id,
            senderId: new mongoose_1.Types.ObjectId(client.user.sub),
            senderType: enums_1.ChatMessageSenderType.AGENT,
            messageType: messageType,
            content: payload.messageContent,
        });
        await this.chatSessionService.updateLastMessageTimestamp(session._id, message.timestamp);
        await this.chatSessionService.updateAgentLastSeen(session._id);
        this.server
            .to(`chatSession:${session._id.toString()}`)
            .emit('server:new_message', message);
        return {
            event: 'server:message_sent_ack',
            data: { messageId: message._id.toString(), timestamp: message.timestamp },
        };
    }
    async handleAgentEndChat(data, client) {
        if (!client.user)
            throw new websockets_1.WsException('Agent not authenticated.');
        if (!data.chatSessionId || !mongoose_1.Types.ObjectId.isValid(data.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        const session = await this.chatSessionService.findByIdOrFail(data.chatSessionId);
        if (session.agentId?.toString() !== client.user.sub) {
            throw new websockets_1.WsException('You are not the agent for this chat.');
        }
        if (session.status === enums_1.ChatSessionStatus.CLOSED_BY_AGENT ||
            session.status === enums_1.ChatSessionStatus.CLOSED_BY_CUSTOMER) {
            throw new websockets_1.WsException('Chat is already closed.');
        }
        const updatedSession = await this.chatSessionService.updateSessionStatus(session._id, enums_1.ChatSessionStatus.CLOSED_BY_AGENT);
        this.server
            .to(`customer:${session.customerId.toString()}`)
            .emit('server:agent_ended_chat', {
            chatSessionId: session._id.toString(),
        });
        const systemMessageContent = `Chat ended by agent. ${data.reason ? 'Reason: ' + data.reason : ''}`;
        const systemMessage = await this.chatMessageService.createMessage({
            chatSessionId: session._id,
            senderId: new mongoose_1.Types.ObjectId(client.user.sub),
            senderType: enums_1.ChatMessageSenderType.SYSTEM,
            messageType: enums_1.ChatMessageType.CHAT_ENDED_NOTICE,
            content: { text: systemMessageContent },
        });
        this.server
            .to(`chatSession:${session._id.toString()}`)
            .emit('server:new_message', systemMessage);
        this.removeParticipantsFromChatRoom(session._id.toString(), client.id, session.customerId.toString());
        this.logger.log(`Agent ${client.user.sub} ended chat ${session._id}. Reason: ${data.reason || 'N/A'}`);
        return {
            event: 'server:chat_ended_ack',
            data: { chatSessionId: session._id.toString() },
        };
    }
    async handleAgentResolveChat(data, client) {
        if (!client.user)
            throw new websockets_1.WsException('Agent not authenticated.');
        if (!data.chatSessionId || !mongoose_1.Types.ObjectId.isValid(data.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        const session = await this.chatSessionService.findByIdOrFail(data.chatSessionId);
        if (session.agentId?.toString() !== client.user.sub) {
            throw new websockets_1.WsException('You are not the agent for this chat.');
        }
        if (session.status === enums_1.ChatSessionStatus.RESOLVED) {
            throw new websockets_1.WsException('Chat is already resolved.');
        }
        const updatedSession = await this.chatSessionService.updateSessionStatus(session._id, enums_1.ChatSessionStatus.RESOLVED);
        this.server
            .to(`customer:${session.customerId.toString()}`)
            .emit('server:agent_resolved_chat', {
            chatSessionId: session._id.toString(),
        });
        const systemMessage = await this.chatMessageService.createMessage({
            chatSessionId: session._id,
            senderId: new mongoose_1.Types.ObjectId(client.user.sub),
            senderType: enums_1.ChatMessageSenderType.SYSTEM,
            messageType: enums_1.ChatMessageType.TEXT,
            content: { text: 'Chat marked as resolved by agent.' },
        });
        this.server
            .to(`chatSession:${session._id.toString()}`)
            .emit('server:new_message', systemMessage);
        this.logger.log(`Agent ${client.user.sub} resolved chat ${session._id}.`);
        return {
            event: 'server:chat_resolved_ack',
            data: { chatSessionId: session._id.toString() },
        };
    }
    async handleCustomerConnectWidget(payload, client) {
        if (!payload.widgetId || !mongoose_1.Types.ObjectId.isValid(payload.widgetId))
            throw new websockets_1.WsException('Invalid widgetId.');
        if (!payload.fingerprint && !payload.customerId)
            throw new websockets_1.WsException('Fingerprint or customerId required.');
        const widget = await this.widgetsService.findByIdPublic(payload.widgetId);
        if (!widget || !widget.isEnabled) {
            throw new websockets_1.WsException('Widget not found or disabled.');
        }
        const customer = await this.customersService.createOrUpdateCustomer({
            widgetId: new mongoose_1.Types.ObjectId(payload.widgetId),
            fingerprint: payload.fingerprint,
            customerId: payload.customerId,
            metadata: {
                browserInfo: payload.browserInfo,
                currentPageUrl: payload.currentPageUrl,
                initialDomain: payload.domain,
            },
        });
        client.customerId = customer._id.toString();
        await this.redisService.mapSocketIdToCustomerId(client.id, customer._id.toString());
        client.join(`customer:${customer._id.toString()}`);
        this.logger.log(`Customer ${customer._id} (fingerprint: ${payload.fingerprint}) connected for widget ${payload.widgetId} with socket ${client.id}`);
        const reconnectSessions = await this.chatSessionService.getSessionsForCustomerReconnect(customer._id);
        let activeSessionForReconnect = null;
        for (const session of reconnectSessions) {
            this.logger.log(`Customer ${customer._id} reconnected. Attempting to restore session ${session._id}.`);
            await this.redisService.del(`${enums_1.REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX}${session._id.toString()}`);
            if (session.status === enums_1.ChatSessionStatus.ACTIVE ||
                session.status === enums_1.ChatSessionStatus.PENDING_AGENT_RECONNECT) {
                activeSessionForReconnect = session;
                await this.chatSessionService.updateCustomerLastSeen(session._id);
                client.join(`chatSession:${session._id.toString()}`);
                if (session.agentId) {
                    const agentUser = await this.usersService.findById(session.agentId);
                    this.server
                        .to(`agent:${session.agentId.toString()}`)
                        .emit('server:customer_reconnected_to_chat', {
                        chatSessionId: session._id.toString(),
                        customerName: customer.name || 'Customer',
                    });
                    if (session.status === enums_1.ChatSessionStatus.ACTIVE && agentUser) {
                        client.emit('server:agent_details_on_accept', {
                            chatSessionId: session._id.toString(),
                            agent: { name: `${agentUser.firstName} ${agentUser.lastName}` },
                        });
                    }
                }
                this.logger.log(`Customer ${customer._id} re-joined chat session ${session._id}.`);
                break;
            }
        }
        const initialAgentAvailability = {};
        if (widget.departmentIds && Array.isArray(widget.departmentIds)) {
            for (const dept of widget.departmentIds) {
                const deptIdStr = dept._id ? dept._id.toString() : dept.toString();
                const agents = await this.agentsService.getEligibleOnlineAgents(new mongoose_1.Types.ObjectId(deptIdStr), payload.domain);
                initialAgentAvailability[deptIdStr] = agents.length > 0;
            }
        }
        return {
            event: 'server:widget_initialized',
            data: {
                customerId: customer._id.toString(),
                departments: (widget.departmentIds || []).map((dep) => ({
                    id: dep._id.toString(),
                    name: dep.name,
                })),
                initialAgentAvailability,
                widgetConfig: {
                    primaryColor: widget.primaryColor,
                    welcomeMessage: widget.welcomeMessage,
                    headerText: widget.headerText,
                },
                activeSession: activeSessionForReconnect
                    ? {
                        chatSessionId: activeSessionForReconnect._id.toString(),
                        status: activeSessionForReconnect.status,
                        agent: activeSessionForReconnect.agentId
                            ? {
                                name: activeSessionForReconnect.agentId.firstName
                                    ? `${activeSessionForReconnect.agentId.firstName} ${activeSessionForReconnect.agentId.lastName}`
                                    : 'Support Agent',
                            }
                            : null,
                    }
                    : null,
            },
        };
    }
    async handleCustomerInitiateChat(payload, client) {
        if (!client.customerId)
            throw new websockets_1.WsException('Customer not identified. Connect widget first.');
        if (client.customerId !== payload.customerId)
            throw new websockets_1.WsException('customerId mismatch.');
        const customer = await this.customersService.findByIdOrFail(client.customerId);
        const widget = await this.widgetsService.findById(payload.widgetId);
        const currentPageUrl = customer.metadata?.currentPageUrl || 'unknown_page';
        const domain = new URL(currentPageUrl).hostname;
        const { session: chatSession, wasNew } = await this.chatSessionService.initiateChat(payload, domain, customer);
        if (!wasNew) {
            client.emit('server:chat_session_pending', {
                chatSessionId: chatSession._id.toString(),
                message: 'You already have an active chat session.',
                existingSession: chatSession,
            });
            client.join(`chatSession:${chatSession._id.toString()}`);
            this.logger.log(`Customer ${client.customerId} attempted to initiate new chat, but existing session ${chatSession._id} found.`);
            return {
                event: 'server:initiate_chat_ack',
                data: { chatSessionId: chatSession._id.toString(), status: 'EXISTING' },
            };
        }
        client.join(`chatSession:${chatSession._id.toString()}`);
        const initialMessage = await this.chatMessageService.createMessage({
            chatSessionId: chatSession._id,
            senderId: new mongoose_1.Types.ObjectId(client.customerId),
            senderType: enums_1.ChatMessageSenderType.CUSTOMER,
            messageType: enums_1.ChatMessageType.TEXT,
            content: { text: payload.initialMessage },
        });
        this.server
            .to(`chatSession:${chatSession._id.toString()}`)
            .emit('server:new_message', initialMessage);
        const eligibleAgents = await this.agentsService.getEligibleOnlineAgents(chatSession.departmentId._id, chatSession.domain);
        if (eligibleAgents.length === 0) {
            this.logger.warn(`No agents available for new chat session ${chatSession._id} in department ${chatSession.departmentId.name}.`);
            client.emit('server:no_agents_available_for_request', {
                departmentId: chatSession.departmentId._id.toString(),
            });
        }
        else {
            this.logger.log(`Notifying ${eligibleAgents.length} eligible agents for new chat session ${chatSession._id}.`);
            client.emit('server:chat_session_pending', {
                chatSessionId: chatSession._id.toString(),
            });
            for (const agent of eligibleAgents) {
                this.server
                    .to(`agent:${agent.userId.toString()}`)
                    .emit('server:new_chat_request', chatSession);
            }
        }
        return {
            event: 'server:initiate_chat_ack',
            data: { chatSessionId: chatSession._id.toString(), status: 'CREATED' },
        };
    }
    async handleCustomerSendMessage(payload, client) {
        if (!client.customerId)
            throw new websockets_1.WsException('Customer not identified.');
        if (!payload.chatSessionId ||
            !mongoose_1.Types.ObjectId.isValid(payload.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        if (!payload.messageContent ||
            typeof payload.messageContent !== 'object' ||
            Object.keys(payload.messageContent).length === 0) {
            throw new websockets_1.WsException('Invalid message content.');
        }
        const session = await this.chatSessionService.findByIdOrFail(payload.chatSessionId);
        if (session.customerId.toString() !== client.customerId ||
            (session.status !== enums_1.ChatSessionStatus.ACTIVE &&
                session.status !== enums_1.ChatSessionStatus.PENDING_AGENT_RECONNECT)) {
            throw new websockets_1.WsException('Cannot send message to this session or session not active.');
        }
        let messageType = enums_1.ChatMessageType.TEXT;
        if (payload.messageContent.url &&
            (payload.messageContent.filename ||
                payload.messageContent.mimetype?.startsWith('image'))) {
            messageType = enums_1.ChatMessageType.IMAGE;
        }
        else if (payload.messageContent.url && payload.messageContent.filename) {
            messageType = enums_1.ChatMessageType.FILE;
        }
        const message = await this.chatMessageService.createMessage({
            chatSessionId: session._id,
            senderId: new mongoose_1.Types.ObjectId(client.customerId),
            senderType: enums_1.ChatMessageSenderType.CUSTOMER,
            messageType: messageType,
            content: payload.messageContent,
        });
        await this.chatSessionService.updateLastMessageTimestamp(session._id, message.timestamp);
        await this.chatSessionService.updateCustomerLastSeen(session._id);
        this.server
            .to(`chatSession:${session._id.toString()}`)
            .emit('server:new_message', message);
        return {
            event: 'server:message_sent_ack',
            data: { messageId: message._id.toString(), timestamp: message.timestamp },
        };
    }
    async handleTypingStart(data, client) {
        if (!data.chatSessionId || !mongoose_1.Types.ObjectId.isValid(data.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        const eventName = client.user
            ? 'server:agent_typing_start'
            : 'server:customer_typing_start';
        this.server
            .to(`chatSession:${data.chatSessionId}`)
            .except(client.id)
            .emit(eventName, { chatSessionId: data.chatSessionId });
    }
    async handleTypingStop(data, client) {
        if (!data.chatSessionId || !mongoose_1.Types.ObjectId.isValid(data.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        const eventName = client.user
            ? 'server:agent_typing_stop'
            : 'server:customer_typing_stop';
        this.server
            .to(`chatSession:${data.chatSessionId}`)
            .except(client.id)
            .emit(eventName, { chatSessionId: data.chatSessionId });
    }
    async handleCustomerMarkMessagesRead(data, client) {
        if (!client.customerId)
            throw new websockets_1.WsException('Customer not identified.');
        if (!data.chatSessionId || !mongoose_1.Types.ObjectId.isValid(data.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        const upToTimestamp = data.lastMessageTimestamp
            ? new Date(data.lastMessageTimestamp)
            : new Date();
        if (isNaN(upToTimestamp.getTime()))
            throw new websockets_1.WsException('Invalid lastMessageTimestamp.');
        await this.chatMessageService.markMessagesAsReadByCustomer(data.chatSessionId, upToTimestamp);
        this.server
            .to(`chatSession:${data.chatSessionId}`)
            .except(client.id)
            .emit('server:messages_read_by_customer', {
            chatSessionId: data.chatSessionId,
            upToTimestamp: upToTimestamp,
        });
    }
    async handleAgentMarkMessagesRead(data, client) {
        if (!client.user)
            throw new websockets_1.WsException('Agent not authenticated.');
        if (!data.chatSessionId || !mongoose_1.Types.ObjectId.isValid(data.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        const upToTimestamp = data.lastMessageTimestamp
            ? new Date(data.lastMessageTimestamp)
            : new Date();
        if (isNaN(upToTimestamp.getTime()))
            throw new websockets_1.WsException('Invalid lastMessageTimestamp.');
        await this.chatMessageService.markMessagesAsReadByAgent(data.chatSessionId, upToTimestamp);
        this.server
            .to(`chatSession:${data.chatSessionId}`)
            .except(client.id)
            .emit('server:messages_read_by_agent', {
            chatSessionId: data.chatSessionId,
            upToTimestamp: upToTimestamp,
        });
    }
    async handleAgentBookAppointment(payload, client) {
        if (!client.user || client.user.role !== enums_1.UserRole.AGENT)
            throw new websockets_1.WsException('Only agents can book appointments via this event.');
        if (!payload.chatSessionId ||
            !mongoose_1.Types.ObjectId.isValid(payload.chatSessionId))
            throw new websockets_1.WsException('Invalid chatSessionId');
        if (!payload.customerId || !mongoose_1.Types.ObjectId.isValid(payload.customerId))
            throw new websockets_1.WsException('Invalid customerId');
        const appointmentData = {
            ...payload,
            agentId: client.user.sub,
        };
        const appointment = await this.appointmentsService.create(appointmentData, client.user);
        this.server
            .to(`customer:${payload.customerId}`)
            .emit('server:appointment_booked_notification', appointment);
        const systemMessage = await this.chatMessageService.createMessage({
            chatSessionId: new mongoose_1.Types.ObjectId(payload.chatSessionId),
            senderId: new mongoose_1.Types.ObjectId(client.user.sub),
            senderType: enums_1.ChatMessageSenderType.SYSTEM,
            messageType: enums_1.ChatMessageType.APPOINTMENT_BOOKED_NOTICE,
            content: {
                text: `An appointment has been scheduled for ${new Date(payload.appointmentTime).toLocaleString()}.`,
                appointmentDetails: appointment.toObject(),
            },
        });
        this.server
            .to(`chatSession:${payload.chatSessionId}`)
            .emit('server:new_message', systemMessage);
        this.logger.log(`Agent ${client.user.sub} booked appointment ${appointment._id} for customer ${payload.customerId}.`);
        return { event: 'server:appointment_booked_ack', data: appointment };
    }
    async removeParticipantsFromChatRoom(chatSessionId, agentSocketId, customerId) {
        const agentClient = this.server.sockets.sockets.get(agentSocketId);
        if (agentClient)
            agentClient.leave(`chatSession:${chatSessionId}`);
        const customerSocketId = await this.redisService.getSocketIdByCustomerId(customerId);
        if (customerSocketId) {
            const customerClient = this.server.sockets.sockets.get(customerSocketId);
            if (customerClient)
                customerClient.leave(`chatSession:${chatSessionId}`);
        }
    }
    sendPriorityChatNotification(agentId, session) {
        this.server
            .to(`agent:${agentId}`)
            .emit('server:priority_chat_notification', session);
    }
    notifyCustomerSessionExpired(customerId, session) {
        this.server
            .to(`customer:${customerId}`)
            .emit('server:chat_session_expired_pending', {
            chatSessionId: session._id.toString(),
            message: 'We could not find an available agent for your chat request in time. Please try again later or leave an offline message.',
        });
    }
    emitSystemMessageToChat(chatSessionId, text, type = 'INFO') {
        const systemMessagePayload = {
            chatSessionId: chatSessionId,
            text: text,
            type: type,
        };
        this.server
            .to(`chatSession:${chatSessionId}`)
            .emit('server:system_message', systemMessagePayload);
    }
    notifyAppointmentBooked(appointment) {
        this.server
            .to(`customer:${appointment.customerId.toString()}`)
            .emit('server:appointment_booked_notification', appointment);
        const systemMessagePayload = {
            chatSessionId: appointment.chatSessionId.toString(),
            senderId: appointment.agentId,
            senderType: enums_1.ChatMessageSenderType.SYSTEM,
            messageType: enums_1.ChatMessageType.APPOINTMENT_BOOKED_NOTICE,
            content: {
                text: `An appointment has been scheduled by an agent for ${new Date(appointment.appointmentTime).toLocaleString()}.`,
                appointmentDetails: appointment.toObject(),
            },
            timestamp: new Date(),
        };
        this.server
            .to(`chatSession:${appointment.chatSessionId.toString()}`)
            .emit('server:new_message', systemMessagePayload);
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:authenticate'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleAgentAuthenticate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:set_online_status'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleAgentSetOnlineStatus", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:accept_chat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleAgentAcceptChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:send_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_message_dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleAgentSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:end_chat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleAgentEndChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:resolve_chat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleAgentResolveChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('customer:connect_widget'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [connect_widget_dto_1.ConnectWidgetDto, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleCustomerConnectWidget", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('customer:initiate_chat'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [initiate_chat_dto_1.InitiateChatDto, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleCustomerInitiateChat", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('customer:send_message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_message_dto_1.SendMessageDto, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleCustomerSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('customer:typing_start'),
    (0, websockets_1.SubscribeMessage)('agent:typing_start'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTypingStart", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('customer:typing_stop'),
    (0, websockets_1.SubscribeMessage)('agent:typing_stop'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleTypingStop", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('customer:mark_messages_read'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleCustomerMarkMessagesRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:mark_messages_read'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleAgentMarkMessagesRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('agent:book_appointment'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_appointment_dto_1.CreateAppointmentDto, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleAgentBookAppointment", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, common_1.UsePipes)(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        exceptionFactory: (errors) => new websockets_1.WsException(errors),
    })),
    (0, common_1.UseFilters)(new all_exceptions_filter_1.AllExceptionsFilter()),
    (0, websockets_1.WebSocketGateway)({
        namespace: '/chat',
        cors: { origin: '*' },
    }),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => agents_service_1.AgentsService))),
    __param(9, (0, common_1.Inject)((0, common_1.forwardRef)(() => appointments_service_1.AppointmentsService))),
    __param(10, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        chat_session_service_1.ChatSessionService,
        chat_message_service_1.ChatMessageService,
        agents_service_1.AgentsService,
        customers_service_1.CustomersService,
        widgets_service_1.WidgetsService,
        departments_service_1.DepartmentsService,
        redis_service_1.RedisService,
        config_1.ConfigService,
        appointments_service_1.AppointmentsService,
        users_service_1.UsersService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map