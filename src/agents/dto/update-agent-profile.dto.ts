import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { DayShiftEntryDto } from '../../auth/dto/shift.dto';

export class UpdateAgentProfileDto {
  @ApiProperty({
    description: 'Array of department IDs that the agent has access to',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  departmentIds?: Types.ObjectId[];

  @ApiProperty({
    description:
      'Array of domains that the agent can handle chats from. Use "*" for all domains',
    type: [String],
    example: ['example.com', 'subdomain.example.com', '*'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domainAccess?: string[];

  @ApiProperty({
    description: 'Agent online status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiProperty({
    description: 'Maximum number of concurrent chats the agent can handle',
    minimum: 1,
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConcurrentChats?: number;

  @ApiProperty({
    description: 'Agent working hours schedule',
    type: [DayShiftEntryDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayShiftEntryDto)
  shifts?: DayShiftEntryDto[];

  @ApiProperty({
    description: 'Timezone for the agent shifts',
    example: 'UTC',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
