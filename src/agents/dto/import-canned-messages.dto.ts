import { ApiProperty } from '@nestjs/swagger';

export class ImportCannedMessagesResponseDto {
  @ApiProperty({
    description: 'Total number of messages processed',
    example: 100,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Number of messages successfully created',
    example: 95,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of messages that failed to create',
    example: 5,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Array of error messages for failed entries',
    type: [String],
    example: [
      'Row 3: A canned message with the title "Welcome Message" already exists for this admin.',
      'Row 7: Title is required and cannot be empty.',
    ],
  })
  errors: string[];

  @ApiProperty({
    description: 'Array of successfully created message IDs',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
  })
  createdMessageIds: string[];

  @ApiProperty({
    description: 'URL to download Excel file containing failed results (if any failures occurred)',
    example: '/uploads/failed-results/failed-canned-messages-1234567890.xlsx',
    required: false,
  })
  failedResultsDownloadUrl?: string;

  @ApiProperty({
    description: 'Import completion timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  importedAt: string;
}

export class ImportCannedMessagesDto {
  @ApiProperty({
    description: 'Excel file containing canned messages to import',
    type: 'string',
    format: 'binary',
  })
  file: any;
}
