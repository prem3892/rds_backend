import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TrafficSource } from 'src/shared/services/attribution.service';

export enum GroupBy {
  SOURCE = 'source',
  DOMAIN = 'domain',
  DATE = 'date',
  AGENT = 'agent',
}

export enum AnalyticsType {
  CHATS = 'chats',
  APPOINTMENTS = 'appointments',
  BOTH = 'both',
}

export enum SortBy {
  CHATS = 'chats',
  APPOINTMENTS = 'appointments',
  CONVERSION_RATE = 'conversionRate',
  DOMAIN = 'domain',
  SOURCE = 'source',
}

export class GetAttributionDto {
  @ApiProperty({
    description: 'Start date for filter (ISO 8601 format)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for filter (ISO 8601 format)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Filter by traffic source',
    example: 'gad',
    enum: ['gad', 'meta', 'chatgpt', 'organic'],
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    description: 'Filter by domain',
    example: 'nwface.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({
    description: 'Analytics type to fetch',
    example: 'both',
    enum: AnalyticsType,
    required: false,
    default: 'both',
  })
  @IsOptional()
  @IsEnum(AnalyticsType)
  type?: AnalyticsType = AnalyticsType.BOTH;

  @ApiProperty({
    description: 'Group results by field',
    example: 'source',
    enum: GroupBy,
    required: false,
    default: 'source',
  })
  @IsOptional()
  @IsEnum(GroupBy)
  groupBy?: GroupBy = GroupBy.SOURCE;

  @ApiProperty({
    description: 'Filter by specific agent (agents only see their own)',
    example: 'agent_id',
    required: false,
  })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiProperty({
    description: 'Only show conversions (appointments)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  conversionOnly?: boolean = false;

  @ApiProperty({
    description: 'Include detailed records',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDetails?: boolean = true;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 50,
    required: false,
    default: 50,
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'chats',
    enum: SortBy,
    required: false,
    default: 'chats',
  })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CHATS;

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
