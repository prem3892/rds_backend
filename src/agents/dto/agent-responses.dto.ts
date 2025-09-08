import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/shared/constants/enums';

export class AgentProfileResponseDto {
  @ApiProperty({
    description: 'Agent profile unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'User ID associated with this agent profile',
    example: '507f1f77bcf86cd799439012',
  })
  userId: string;

  @ApiProperty({
    description: 'Admin ID who created this agent profile',
    example: '507f1f77bcf86cd799439013',
  })
  adminId: string;

  @ApiProperty({
    description: 'Array of department IDs that the agent has access to',
    type: [String],
    example: ['507f1f77bcf86cd799439014', '507f1f77bcf86cd799439015'],
  })
  departmentIds: string[];

  @ApiProperty({
    description: 'Array of domains that the agent can handle chats from',
    type: [String],
    example: ['example.com', '*'],
  })
  domainAccess: string[];

  @ApiProperty({
    description: 'Agent online status',
    example: true,
  })
  isOnline: boolean;

  @ApiProperty({
    description: 'Maximum number of concurrent chats the agent can handle',
    example: 5,
  })
  maxConcurrentChats: number;

  @ApiProperty({
    description: 'Profile picture URL or file path for the agent',
    example: '/uploads/profile-pictures/agent-123-uuid.jpg',
    required: false,
  })
  profilePicture?: string;

  @ApiProperty({
    description: 'Profile creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Profile last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Associated user information',
    type: 'object',
    properties: {
      email: { type: 'string', example: 'agent@example.com' },
      firstName: { type: 'string', example: 'John' },
      lastName: { type: 'string', example: 'Doe' },
    },
    nullable: true,
  })
  user?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export class CannedMessageResponseDto {
  @ApiProperty({
    description: 'Canned message unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Title of the canned message',
    example: 'Welcome Message',
  })
  title: string;

  @ApiProperty({
    description: 'Content of the canned message',
    example: 'Hello! Welcome to our support chat. How can I help you today?',
  })
  content: string;

  @ApiProperty({
    description: 'Whether this message is available to all agents globally',
    example: false,
  })
  isGlobal: boolean;

  @ApiProperty({
    description: 'Array of department IDs where this message is available',
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
  })
  departmentIds: string[];

  @ApiProperty({
    description: 'Tags for categorizing and searching canned messages',
    type: [String],
    example: ['greeting', 'welcome', 'support'],
  })
  tags: string[];

  @ApiProperty({
    description: 'Agent ID who created this message',
    example: '507f1f77bcf86cd799439012',
  })
  agentId: string;

  @ApiProperty({
    description: 'Message creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Message last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}

export class AgentStatusResponseDto {
  @ApiProperty({
    description: 'Agent ID',
    example: '507f1f77bcf86cd799439011',
  })
  agentId: string;

  @ApiProperty({
    description: 'Updated online status',
    example: true,
  })
  isOnline: boolean;

  @ApiProperty({
    description: 'Status update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: string;
}
