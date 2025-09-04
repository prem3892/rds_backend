import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class ContactResponseDto {
  @ApiProperty({
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    description: 'First name of the contact',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name of the contact',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Email address of the contact',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Phone number of the contact',
    example: '+1234567890',
    required: false,
  })
  phone?: string;

  @ApiProperty({
    description: 'Customer information',
    type: 'object',
    properties: {
      _id: {
        type: 'string',
        example: '507f1f77bcf86cd799439011',
      },
      name: {
        type: 'string',
        example: 'Customer Name',
      },
      email: {
        type: 'string',
        example: 'customer@example.com',
      },
      fingerprint: {
        type: 'string',
        example: 'abc123def456',
      },
    },
  })
  customer: {
    _id: Types.ObjectId;
    name?: string;
    email?: string;
    fingerprint: string;
  };

  @ApiProperty({
    description: 'Contact creation date',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Contact last update date',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
