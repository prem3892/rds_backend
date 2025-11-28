import { ApiProperty } from '@nestjs/swagger';

export class SourceBreakdownDto {
  @ApiProperty({
    example: 'gad',
    description: 'Traffic source',
  })
  source: string;

  @ApiProperty({
    example: 80,
    description: 'Total chats from this source',
  })
  chats: number;

  @ApiProperty({
    example: 28,
    description: 'Total appointments/conversions from this source',
  })
  appointments: number;

  @ApiProperty({
    example: '35%',
    description: 'Conversion rate',
  })
  conversionRate: string;
}

export class SummaryDto {
  @ApiProperty({
    example: 150,
    description: 'Total chat sessions',
  })
  totalChats: number;

  @ApiProperty({
    example: 45,
    description: 'Total conversions (appointments)',
  })
  totalAppointments: number;

  @ApiProperty({
    example: '30%',
    description: 'Overall conversion rate',
  })
  conversionRate: string;

  @ApiProperty({
    type: [SourceBreakdownDto],
    description: 'Breakdown by traffic source',
  })
  breakdown: SourceBreakdownDto[];
}

export class DetailedRecordDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Chat session ID',
  })
  chatSessionId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439012',
    description: 'Customer ID',
  })
  customerId: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439013',
    description: 'Agent ID',
  })
  agentId?: string;

  @ApiProperty({
    example: 'Dr. Young',
    description: 'Agent name',
  })
  agentName?: string;

  @ApiProperty({
    example: 'gad',
    description: 'Traffic source',
  })
  source: string;

  @ApiProperty({
    example: 'nwface.com',
    description: 'Domain',
  })
  domain: string;

  @ApiProperty({
    example: 'NWF - Master - New',
    description: 'Campaign name',
  })
  campaignName?: string;

  @ApiProperty({
    example: '2024-01-15T10:30:00Z',
    description: 'Chat creation date',
  })
  createdAt: string;

  @ApiProperty({
    example: '507f1f77bcf86cd799439014',
    description: 'Appointment ID if exists',
    required: false,
  })
  appointmentId?: string;

  @ApiProperty({
    example: '2024-01-20T14:00:00Z',
    description: 'Appointment booking date if exists',
    required: false,
  })
  appointmentDate?: string;

  @ApiProperty({
    example: 'SCHEDULED',
    description: 'Appointment status',
    required: false,
  })
  appointmentStatus?: string;
}

export class PaginationMetaDto {
  @ApiProperty({
    example: 1,
    description: 'Current page',
  })
  page: number;

  @ApiProperty({
    example: 50,
    description: 'Items per page',
  })
  limit: number;

  @ApiProperty({
    example: 250,
    description: 'Total records',
  })
  total: number;

  @ApiProperty({
    example: 5,
    description: 'Total pages',
  })
  totalPages: number;

  @ApiProperty({
    example: true,
    description: 'Has next page',
  })
  hasNext: boolean;

  @ApiProperty({
    example: false,
    description: 'Has previous page',
  })
  hasPrev: boolean;
}

export class GetAttributionResponseDto {
  @ApiProperty({
    type: SummaryDto,
    description: 'Summary statistics',
  })
  summary: SummaryDto;

  @ApiProperty({
    type: [DetailedRecordDto],
    description: 'Detailed records',
  })
  items: DetailedRecordDto[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Pagination metadata',
  })
  meta: PaginationMetaDto;
}
