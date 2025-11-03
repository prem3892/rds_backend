import {
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ChatSessionStatus } from '../../shared/constants/enums';

export class GetChatSessionsQueryDto {
  @ApiProperty({
    description: 'Number of chat sessions to retrieve per page',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @IsNumberString()
  limit?: number;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @IsNumberString()
  page?: number;

  @ApiProperty({
    description: 'Filter by chat session status',
    enum: ChatSessionStatus,
    example: ChatSessionStatus.ACTIVE,
    required: false,
    enumName: 'ChatSessionStatus',
  })
  @IsOptional()
  @IsEnum(ChatSessionStatus)
  status?: ChatSessionStatus;

  @ApiProperty({
    description: 'Filter by agent ID',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  agentId?: string;

  @ApiProperty({
    description: 'Filter by department ID',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @ApiProperty({
    description: 'Filter by customer name (partial match)',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiProperty({
    description: 'Filter by customer email (partial match)',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiProperty({
    description: 'Filter sessions that have scheduled appointments',
    example: true,
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  hasScheduledAppointment?: boolean;

  @ApiProperty({
    description: 'Filter sessions initiated from this date (ISO 8601 format)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Filter sessions initiated until this date (ISO 8601 format)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
