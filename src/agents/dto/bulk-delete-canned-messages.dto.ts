import {
  IsArray,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  IsMongoId,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteCannedMessagesDto {
  @ApiProperty({
    description: 'Array of canned message IDs to delete',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one message ID is required' })
  @ArrayMaxSize(100, {
    message: 'Cannot delete more than 100 messages at once',
  })
  @IsString({ each: true })
  @IsMongoId({
    each: true,
    message: 'Each message ID must be a valid MongoDB ObjectId',
  })
  messageIds: string[];
}

export class BulkDeleteCannedMessagesResponseDto {
  @ApiProperty({
    description: 'Total number of messages processed for deletion',
    example: 10,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Number of messages successfully deleted',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of messages that failed to delete',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Array of error messages for failed deletions',
    type: [String],
    example: [
      'Message ID 507f1f77bcf86cd799439011 not found',
      'Message ID 507f1f77bcf86cd799439012 is not owned by this agent',
    ],
  })
  errors: string[];

  @ApiProperty({
    description: 'Array of successfully deleted message IDs',
    type: [String],
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
  })
  deletedMessageIds: string[];

  @ApiProperty({
    description:
      'Array of message IDs that were not found or could not be deleted',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  failedMessageIds: string[];
}
