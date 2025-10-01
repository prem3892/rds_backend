import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum TimeFilter {
  TODAY = 'today',
  LAST_WEEK = 'last_week',
  LAST_MONTH = 'last_month',
}

export enum MetricsSortBy {
  DOMAIN = 'domain',
  ACCEPTED_CHATS = 'acceptedChats',
  RESPONDED_CHATS = 'respondedChats',
  AVG_RESPONSE_TIME = 'avgResponseTime',
  PROACTIVE_CHATS = 'proactiveChats',
}

export class GetAgentMetricsDto {
  @ApiProperty({
    description: 'Time period filter for metrics',
    example: 'last_week',
    enum: TimeFilter,
    required: true,
  })
  @IsEnum(TimeFilter)
  timeFilter: TimeFilter;

  @ApiProperty({
    description: 'Filter by specific domain',
    example: 'allureesthetic.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  domain?: string;

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
    example: 10,
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Field to sort by',
    example: 'acceptedChats',
    required: false,
    default: 'acceptedChats',
    enum: MetricsSortBy,
  })
  @IsOptional()
  @IsEnum(MetricsSortBy)
  sortBy?: MetricsSortBy = MetricsSortBy.ACCEPTED_CHATS;

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    required: false,
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
