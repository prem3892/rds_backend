import { ApiProperty } from '@nestjs/swagger';
import { VisitorStatus, VisitorChangeType } from '../../shared/constants/enums';

export class VisitorStateDto {
  @ApiProperty({
    description: 'Unique customer identifier',
    example: '507f1f77bcf86cd799439011',
  })
  customerId: string;

  @ApiProperty({
    description: 'Customer name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Current visitor status',
    enum: VisitorStatus,
    example: VisitorStatus.CONNECTED,
  })
  status: VisitorStatus;

  @ApiProperty({
    description: 'Last activity timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastActivity: Date;

  @ApiProperty({
    description: 'Additional metadata about the visitor',
    example: { source: 'website', referrer: 'google.com' },
  })
  metadata: Record<string, any>;

  @ApiProperty({
    description: 'When the visitor first connected',
    example: '2024-01-15T10:00:00.000Z',
  })
  connectedAt: Date;

  @ApiProperty({
    description: 'Socket connection ID (if connected)',
    example: 'socket_123456',
    required: false,
  })
  socketId?: string;

  @ApiProperty({
    description: 'Widget ID the visitor is using',
    example: '507f1f77bcf86cd799439012',
  })
  widgetId: string;

  @ApiProperty({
    description: 'Domain where the visitor is browsing',
    example: 'example.com',
  })
  domain: string;

  @ApiProperty({
    description: 'Visitor email address',
    example: 'john.doe@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Visitor phone number',
    example: '+1234567890',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Browser fingerprint for visitor identification',
    example: 'fp_abc123def456',
    required: false,
  })
  fingerprint?: string;

  @ApiProperty({
    description: 'Current page URL the visitor is on',
    example: 'https://example.com/products',
    required: false,
  })
  currentPageUrl?: string;

  @ApiProperty({
    description: 'Browser and device information',
    example: { userAgent: 'Mozilla/5.0...', platform: 'Win32' },
    required: false,
  })
  browserInfo?: Record<string, any>;
}

export class VisitorChangeDto {
  @ApiProperty({
    description: 'Type of change that occurred',
    enum: VisitorChangeType,
    example: VisitorChangeType.UPDATE,
  })
  type: VisitorChangeType;

  @ApiProperty({
    description: 'Customer ID that changed',
    example: '507f1f77bcf86cd799439011',
  })
  customerId: string;

  @ApiProperty({
    description: 'Changed visitor data',
    type: VisitorStateDto,
  })
  data: Partial<VisitorStateDto>;

  @ApiProperty({
    description: 'When the change occurred',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: Date;
}

export class VisitorListResponseDto {
  @ApiProperty({
    description: 'Array of current visitors',
    type: [VisitorStateDto],
  })
  visitors: VisitorStateDto[];

  @ApiProperty({
    description: 'Total number of visitors',
    example: 25,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Whether there are more visitors to fetch',
    example: true,
  })
  hasMore: boolean;

  @ApiProperty({
    description: 'Cursor for pagination',
    example: 'cursor_abc123',
    required: false,
  })
  nextCursor?: string;

  @ApiProperty({
    description: 'Timestamp of when this data was generated',
    example: '2024-01-15T10:30:00.000Z',
  })
  lastSync: Date;
}

export class VisitorSyncResponseDto {
  @ApiProperty({
    description: 'Timestamp since when changes are provided',
    example: '2024-01-15T10:30:00.000Z',
  })
  since: string;

  @ApiProperty({
    description: 'Array of visitor changes',
    type: [VisitorChangeDto],
  })
  changes: VisitorChangeDto[];

  @ApiProperty({
    description: 'Whether this is a full sync or delta update',
    example: false,
  })
  fullSync: boolean;

  @ApiProperty({
    description: 'Total number of visitors (for full sync)',
    example: 25,
    required: false,
  })
  totalVisitors?: number;

  @ApiProperty({
    description: 'Whether there are more changes to fetch',
    example: false,
    required: false,
  })
  hasMore?: boolean;

  @ApiProperty({
    description: 'Cursor for fetching more changes',
    example: 'cursor_def456',
    required: false,
  })
  nextCursor?: string;
}

export class VisitorStatisticsResponseDto {
  @ApiProperty({
    description: 'Total number of visitors tracked',
    example: 150,
  })
  totalVisitors: number;

  @ApiProperty({
    description: 'Number of currently connected visitors',
    example: 25,
  })
  connectedVisitors: number;

  @ApiProperty({
    description: 'Number of disconnected visitors',
    example: 125,
  })
  disconnectedVisitors: number;

  @ApiProperty({
    description: 'Breakdown of visitors by widget',
    example: {
      '507f1f77bcf86cd799439012': 15,
      '507f1f77bcf86cd799439013': 10,
    },
  })
  widgetBreakdown: Record<string, number>;
}

export class VisitorCleanupResponseDto {
  @ApiProperty({
    description: 'Number of visitors cleaned up',
    example: 50,
  })
  cleanedCount: number;

  @ApiProperty({
    description: 'Total number of visitors processed',
    example: 200,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Array of error messages during cleanup',
    example: ['Failed to clean visitor abc123'],
    type: [String],
  })
  errors: string[];
}
