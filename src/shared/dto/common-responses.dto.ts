import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ description: 'Success status of the request' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data?: T;

  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp: string;
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrev: boolean;
}

export class PaginatedResponseDto<T = any> {
  @ApiProperty({ description: 'Array of items' })
  items: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 400 })
  statusCode: number;

  @ApiProperty({
    description: 'Error message or array of validation errors',
    oneOf: [
      { type: 'string', example: 'Bad Request' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['email must be a valid email'],
      },
    ],
  })
  message: string | string[];

  @ApiProperty({ description: 'Error type', example: 'Bad Request' })
  error: string;

  @ApiProperty({ description: 'Timestamp of the error' })
  timestamp: string;

  @ApiProperty({ description: 'Request path', example: '/api/auth/login' })
  path: string;
}

export class UnauthorizedResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 401 })
  statusCode: number;

  @ApiProperty({ description: 'Error message', example: 'Unauthorized' })
  message: string;

  @ApiProperty({ description: 'Error type', example: 'Unauthorized' })
  error: string;
}

export class ForbiddenResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 403 })
  statusCode: number;

  @ApiProperty({ description: 'Error message', example: 'Forbidden resource' })
  message: string;

  @ApiProperty({ description: 'Error type', example: 'Forbidden' })
  error: string;
}

export class NotFoundResponseDto {
  @ApiProperty({ description: 'HTTP status code', example: 404 })
  statusCode: number;

  @ApiProperty({ description: 'Error message', example: 'Resource not found' })
  message: string;

  @ApiProperty({ description: 'Error type', example: 'Not Found' })
  error: string;
}

export class SuccessMessageResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Operation completed successfully',
  })
  message: string;
}
