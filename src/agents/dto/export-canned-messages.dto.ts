import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsString } from 'class-validator';

export class ExportCannedMessagesDto {
  @ApiProperty({
    description: 'Filter by specific department IDs (comma-separated)',
    required: false,
    example: '507f1f77bcf86cd799439011,507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsString()
  departmentIds?: string;

  @ApiProperty({
    description: 'Filter by global messages only',
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @ApiProperty({
    description: 'Search term to filter by title or content',
    required: false,
    example: 'welcome',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by specific tags (comma-separated)',
    required: false,
    example: 'greeting,support',
  })
  @IsOptional()
  @IsString()
  tags?: string;
}

export class ExportCannedMessagesResponseDto {
  @ApiProperty({
    description: 'URL to download the exported Excel file',
    example: '/uploads/exports/canned-messages-export-1234567890.xlsx',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'Total number of canned messages exported',
    example: 150,
  })
  totalExported: number;

  @ApiProperty({
    description: 'Export completion timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  exportedAt: string;

  @ApiProperty({
    description: 'Filename of the exported file',
    example: 'canned-messages-export-1234567890.xlsx',
  })
  filename: string;
}
