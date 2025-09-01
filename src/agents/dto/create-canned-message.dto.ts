import {
  IsString,
  IsBoolean,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCannedMessageDto {
  @ApiProperty({
    description: 'Title of the canned message',
    minLength: 1,
    maxLength: 100,
    example: 'Welcome Message',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({
    description: 'Content of the canned message',
    minLength: 1,
    maxLength: 2000,
    example: 'Hello! Welcome to our support chat. How can I help you today?',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiProperty({
    description: 'Whether this message is available to all agents globally',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean = false;

  @ApiProperty({
    description: 'Array of department IDs where this message is available',
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiProperty({
    description: 'Tags for categorizing and searching canned messages',
    type: [String],
    example: ['greeting', 'welcome', 'support'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    value?.map((tag: string) => tag.trim().toLowerCase()),
  )
  tags?: string[];
}
