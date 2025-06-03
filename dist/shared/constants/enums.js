"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX = exports.REDIS_AGENT_RECONNECT_PENDING_PREFIX = exports.REDIS_CUSTOMER_SOCKET_ID_PREFIX = exports.REDIS_AGENT_SOCKET_ID_PREFIX = exports.REDIS_SOCKET_CUSTOMER_PREFIX = exports.REDIS_SOCKET_AGENT_PREFIX = exports.AppointmentStatus = exports.ChatMessageType = exports.ChatMessageSenderType = exports.ChatSessionStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["AGENT"] = "AGENT";
})(UserRole || (exports.UserRole = UserRole = {}));
var ChatSessionStatus;
(function (ChatSessionStatus) {
    ChatSessionStatus["PENDING_ASSIGNMENT"] = "PENDING_ASSIGNMENT";
    ChatSessionStatus["ACTIVE"] = "ACTIVE";
    ChatSessionStatus["RESOLVED"] = "RESOLVED";
    ChatSessionStatus["CLOSED_BY_AGENT"] = "CLOSED_BY_AGENT";
    ChatSessionStatus["CLOSED_BY_CUSTOMER"] = "CLOSED_BY_CUSTOMER";
    ChatSessionStatus["ABANDONED_BY_CUSTOMER"] = "ABANDONED_BY_CUSTOMER";
    ChatSessionStatus["PENDING_AGENT_RECONNECT"] = "PENDING_AGENT_RECONNECT";
    ChatSessionStatus["ABANDONED_BY_AGENT"] = "ABANDONED_BY_AGENT";
    ChatSessionStatus["EXPIRED_PENDING_ASSIGNMENT"] = "EXPIRED_PENDING_ASSIGNMENT";
    ChatSessionStatus["OFFLINE_MESSAGE"] = "OFFLINE_MESSAGE";
})(ChatSessionStatus || (exports.ChatSessionStatus = ChatSessionStatus = {}));
var ChatMessageSenderType;
(function (ChatMessageSenderType) {
    ChatMessageSenderType["AGENT"] = "AGENT";
    ChatMessageSenderType["CUSTOMER"] = "CUSTOMER";
    ChatMessageSenderType["SYSTEM"] = "SYSTEM";
})(ChatMessageSenderType || (exports.ChatMessageSenderType = ChatMessageSenderType = {}));
var ChatMessageType;
(function (ChatMessageType) {
    ChatMessageType["TEXT"] = "TEXT";
    ChatMessageType["IMAGE"] = "IMAGE";
    ChatMessageType["FILE"] = "FILE";
    ChatMessageType["APPOINTMENT_BOOKED_NOTICE"] = "APPOINTMENT_BOOKED_NOTICE";
    ChatMessageType["CHAT_ENDED_NOTICE"] = "CHAT_ENDED_NOTICE";
})(ChatMessageType || (exports.ChatMessageType = ChatMessageType = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
exports.REDIS_SOCKET_AGENT_PREFIX = 'socket:agent:';
exports.REDIS_SOCKET_CUSTOMER_PREFIX = 'socket:customer:';
exports.REDIS_AGENT_SOCKET_ID_PREFIX = 'agent:socket:';
exports.REDIS_CUSTOMER_SOCKET_ID_PREFIX = 'customer:socket:';
exports.REDIS_AGENT_RECONNECT_PENDING_PREFIX = 'agent_reconnect_pending:';
exports.REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX = 'customer_reconnect_pending:';
//# sourceMappingURL=enums.js.map