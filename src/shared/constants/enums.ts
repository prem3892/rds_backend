export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  AGENT = 'AGENT',
}

export enum ChatSessionStatus {
  PENDING_ASSIGNMENT = 'PENDING_ASSIGNMENT',
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  CLOSED_BY_AGENT = 'CLOSED_BY_AGENT',
  CLOSED_BY_CUSTOMER = 'CLOSED_BY_CUSTOMER',
  ABANDONED_BY_CUSTOMER = 'ABANDONED_BY_CUSTOMER',
  PENDING_AGENT_RECONNECT = 'PENDING_AGENT_RECONNECT',
  ABANDONED_BY_AGENT = 'ABANDONED_BY_AGENT',
  EXPIRED_PENDING_ASSIGNMENT = 'EXPIRED_PENDING_ASSIGNMENT',
  OFFLINE_MESSAGE = 'OFFLINE_MESSAGE',
}

export enum ChatMessageSenderType {
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER',
  SYSTEM = 'SYSTEM',
}

export enum ChatMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  APPOINTMENT_BOOKED_NOTICE = 'APPOINTMENT_BOOKED_NOTICE',
  CUSTOMER_INFO_REQUESTED_NOTICE = 'CUSTOMER_INFO_REQUESTED_NOTICE',
  CHAT_ENDED_NOTICE = 'CHAT_ENDED_NOTICE',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const REDIS_SOCKET_AGENT_PREFIX = 'socket:agent:';
export const REDIS_SOCKET_CUSTOMER_PREFIX = 'socket:customer:';
export const REDIS_AGENT_SOCKET_ID_PREFIX = 'agent:socket:';
export const REDIS_CUSTOMER_SOCKET_ID_PREFIX = 'customer:socket:';
export const REDIS_AGENT_SOCKETS_PREFIX = 'agent:sockets:'; // New: for multi-socket support
export const REDIS_CUSTOMER_SOCKETS_PREFIX = 'customer:sockets:'; // New: for customer multi-socket support
export const REDIS_AGENT_RECONNECT_PENDING_PREFIX = 'agent_reconnect_pending:';
export const REDIS_CUSTOMER_RECONNECT_PENDING_PREFIX =
  'customer_reconnect_pending:';

// Visitor Tracking Constants
export const REDIS_VISITOR_STATE_PREFIX = 'visitor_state:';
export const REDIS_VISITOR_ACTIVITY_PREFIX = 'visitor_activity:';

export enum VisitorStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
}

export enum VisitorEventType {
  CONNECT = 'visitor_connected',
  DISCONNECT = 'visitor_disconnected',
  RECONNECT = 'visitor_reconnected',
  UPDATE = 'visitor_updated',
}

export enum VisitorChangeType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  UPDATE = 'update',
}
