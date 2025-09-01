import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class AutoMessageResponseDto {
  @ApiProperty({
    description: 'Auto message unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    description: 'Title of the auto message',
    example: 'Welcome to our support',
  })
  title: string;

  @ApiProperty({
    description: 'Content of the auto message',
    example: 'Hello! How can we help you today?',
  })
  message: string;

  @ApiProperty({
    description: 'Widget ID this auto message belongs to',
    example: '507f1f77bcf86cd799439011',
  })
  widgetId: Types.ObjectId;

  @ApiProperty({
    description: 'Domain where this auto message will be displayed',
    example: 'example.com',
  })
  domain: string;

  @ApiProperty({
    description:
      'Whether this auto message should be shown on every page (sitewide)',
    example: false,
  })
  sitewide: boolean;

  @ApiProperty({
    description:
      'Array of page paths where this auto message will be displayed',
    example: ['path/to/post1', 'path/to/post2'],
    type: [String],
  })
  pagePaths: string[];

  @ApiProperty({
    description: 'Number of seconds to wait before showing the auto message',
    example: 5,
  })
  showAfterSeconds: number;

  @ApiProperty({
    description: 'Whether the auto message is enabled',
    example: true,
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'User ID who created this auto message',
    example: '507f1f77bcf86cd799439011',
  })
  createdBy: Types.ObjectId;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

export class PublicAutoMessageDto {
  @ApiProperty({
    description: 'Auto message unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    description: 'Title of the auto message',
    example: 'Welcome to our support',
  })
  title: string;

  @ApiProperty({
    description: 'Content of the auto message',
    example: 'Hello! How can we help you today?',
  })
  message: string;

  @ApiProperty({
    description:
      'Whether this auto message should be shown on every page (sitewide)',
    example: false,
  })
  sitewide: boolean;

  @ApiProperty({
    description:
      'Array of page paths where this auto message will be displayed',
    example: ['path/to/post1', 'path/to/post2'],
    type: [String],
  })
  pagePaths: string[];

  @ApiProperty({
    description: 'Number of seconds to wait before showing the auto message',
    example: 5,
  })
  showAfterSeconds: number;
}

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of items',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrev: boolean;
}

export class PaginatedAutoMessagesResponseDto {
  @ApiProperty({
    description: 'Array of auto messages',
    type: [AutoMessageResponseDto],
  })
  items: AutoMessageResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetaDto,
  })
  meta: PaginationMetaDto;
}
