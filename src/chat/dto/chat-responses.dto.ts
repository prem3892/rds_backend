import { ApiProperty } from '@nestjs/swagger';
import {
  ChatSessionStatus,
  ChatMessageType,
} from '../../shared/constants/enums';

export class ChatMessageResponseDto {
  @ApiProperty({
    description: 'Message unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Chat session ID this message belongs to',
    example: '507f1f77bcf86cd799439012',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Type of message',
    enum: ChatMessageType,
    example: ChatMessageType.TEXT,
    enumName: 'ChatMessageType',
  })
  type: ChatMessageType;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how can I help you today?',
  })
  content: string;

  @ApiProperty({
    description: 'Sender information',
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['customer', 'agent'], example: 'agent' },
      id: { type: 'string', example: '507f1f77bcf86cd799439013' },
      name: { type: 'string', example: 'John Agent' },
    },
  })
  sender: {
    type: 'customer' | 'agent';
    id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Message timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Whether the message has been read',
    example: true,
  })
  isRead: boolean;

  @ApiProperty({
    description: 'File attachment information (if applicable)',
    type: 'object',
    properties: {
      filename: { type: 'string', example: 'document.pdf' },
      url: { type: 'string', example: '/uploads/files/document.pdf' },
      size: { type: 'number', example: 1024 },
      mimeType: { type: 'string', example: 'application/pdf' },
    },
    nullable: true,
  })
  attachment?: {
    filename: string;
    url: string;
    size: number;
    mimeType: string;
  };
}

export class ChatSessionResponseDto {
  @ApiProperty({
    description: 'Chat session unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Customer information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '507f1f77bcf86cd799439012' },
      name: { type: 'string', example: 'John Customer' },
      email: { type: 'string', example: 'john@example.com' },
      fingerprint: { type: 'string', example: 'fp_abc123def456' },
    },
  })
  customerId: {
    id: string;
    name: string;
    email: string;
    fingerprint: string;
  };

  @ApiProperty({
    description: 'Assigned agent information',
    type: 'object',
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
      firstName: { type: 'string', example: 'Jane' },
      lastName: { type: 'string', example: 'Agent' },
      email: { type: 'string', example: 'jane@company.com' },
    },
    nullable: true,
  })
  agentId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Department information',
    type: 'object',
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439014' },
      name: { type: 'string', example: 'Technical Support' },
    },
  })
  departmentId: {
    _id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Widget information',
    type: 'object',
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439015' },
      name: { type: 'string', example: 'Main Website Widget' },
    },
  })
  widgetId: {
    _id: string;
    name: string;
  };

  @ApiProperty({
    description: 'Chat session status',
    enum: ChatSessionStatus,
    example: ChatSessionStatus.ACTIVE,
    enumName: 'ChatSessionStatus',
  })
  status: ChatSessionStatus;

  @ApiProperty({
    description: 'Session start timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  startedAt: string;

  @ApiProperty({
    description: 'Session end timestamp',
    example: '2024-01-15T11:30:00.000Z',
    required: false,
  })
  endedAt?: string;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-15T11:25:00.000Z',
  })
  lastActivity: string;

  @ApiProperty({
    description: 'Number of unread messages',
    example: 2,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'Session creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Session last update timestamp',
    example: '2024-01-15T11:25:00.000Z',
  })
  updatedAt: string;
}

export class ActiveChatSessionResponseDto {
  @ApiProperty({
    description: 'Chat session unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Customer',
  })
  customerName: string;

  @ApiProperty({
    description: 'Department name',
    example: 'Technical Support',
  })
  departmentName: string;

  @ApiProperty({
    description: 'Session start timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  startedAt: string;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-15T11:25:00.000Z',
  })
  lastActivity: string;

  @ApiProperty({
    description: 'Number of unread messages',
    example: 2,
  })
  unreadCount: number;

  @ApiProperty({
    description: 'Chat session status',
    enum: ChatSessionStatus,
    example: ChatSessionStatus.ACTIVE,
  })
  status: ChatSessionStatus;
}
