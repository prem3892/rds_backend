import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class CustomerResponseDto {
  @ApiProperty({
    description: 'Unique MongoDB ObjectId of the customer',
    example: '507f1f77bcf86cd799439011',
    format: 'ObjectId',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    description:
      'Unique browser fingerprint used to identify anonymous customers',
    example: 'fp_abc123xyz789',
  })
  fingerprint: string;

  @ApiProperty({
    description:
      'Customer display name (optional, provided during chat initiation)',
    example: 'John Doe',
    required: false,
    nullable: true,
  })
  name?: string;

  @ApiProperty({
    description:
      'Customer email address (optional, provided during chat initiation)',
    example: 'john.doe@example.com',
    required: false,
    nullable: true,
  })
  email?: string;

  @ApiProperty({
    description:
      'MongoDB ObjectId of the widget this customer is associated with',
    example: '507f1f77bcf86cd799439012',
    format: 'ObjectId',
  })
  widgetId: Types.ObjectId;

  @ApiProperty({
    description:
      'Indicates whether the customer is currently blocked from accessing chat services',
    example: true,
  })
  isBlocked: boolean;

  @ApiProperty({
    description: 'MongoDB ObjectId of the admin user who blocked this customer',
    example: '507f1f77bcf86cd799439013',
    format: 'ObjectId',
    required: false,
    nullable: true,
  })
  blockedBy?: Types.ObjectId;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the customer was blocked',
    example: '2024-01-15T10:30:00.000Z',
    format: 'date-time',
    required: false,
    nullable: true,
  })
  blockedAt?: Date;

  @ApiProperty({
    description:
      'Additional metadata about the customer including browser info, current page URL, etc.',
    example: {
      browserInfo: 'Chrome/120.0.0.0',
      currentPageUrl: 'https://example.com/contact',
      initialDomain: 'example.com',
      os: 'Windows 10',
    },
    required: false,
    nullable: true,
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'ISO 8601 timestamp when the customer record was created',
    example: '2024-01-10T08:00:00.000Z',
    format: 'date-time',
  })
  createdAt: Date;
}

// Note: BlockedCustomersListResponseDto is now replaced by PaginatedResponseDto<CustomerResponseDto>
// This is kept for backward compatibility but should be deprecated
export class BlockedCustomersListResponseDto {
  @ApiProperty({
    description: 'Array of blocked customers with complete details',
    type: [CustomerResponseDto],
    example: [
      {
        _id: '507f1f77bcf86cd799439011',
        fingerprint: 'fp_abc123xyz789',
        name: 'John Doe',
        email: 'john.doe@example.com',
        widgetId: '507f1f77bcf86cd799439012',
        isBlocked: true,
        blockedBy: '507f1f77bcf86cd799439013',
        blockedAt: '2024-01-15T10:30:00.000Z',
        metadata: {
          browserInfo: 'Chrome/120.0.0.0',
          currentPageUrl: 'https://example.com/contact',
          initialDomain: 'example.com',
        },
        createdAt: '2024-01-10T08:00:00.000Z',
      },
    ],
  })
  customers: CustomerResponseDto[];

  @ApiProperty({
    description: 'Total number of blocked customers in the system',
    example: 25,
    minimum: 0,
  })
  total: number;
}

export class BlockCustomerResponseDto {
  @ApiProperty({
    description: 'Success message confirming the customer has been blocked',
    example: 'Customer blocked successfully',
  })
  message: string;

  @ApiProperty({
    description:
      'Complete customer data after blocking, including blocking metadata',
    type: CustomerResponseDto,
  })
  customer: CustomerResponseDto;
}

export class UnblockCustomerResponseDto {
  @ApiProperty({
    description: 'Success message confirming the customer has been unblocked',
    example: 'Customer unblocked successfully',
  })
  message: string;

  @ApiProperty({
    description:
      'Complete customer data after unblocking, with blocking metadata cleared',
    type: CustomerResponseDto,
  })
  customer: CustomerResponseDto;
}
