import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/shared/constants/enums';

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      email: { type: 'string', example: 'admin@example.com' },
      firstName: { type: 'string', example: 'John' },
      lastName: { type: 'string', example: 'Doe' },
      role: { enum: UserRole, example: UserRole.ADMIN },
      phoneNo: { type: 'string', example: '+1234567890', required: false },
      website: {
        type: 'string',
        example: 'https://example.com',
        required: false,
      },
      isEmailVerified: { type: 'boolean', example: true },
    },
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phoneNo?: string;
    website?: string;
    isEmailVerified: boolean;
  };
}

export class RefreshTokenResponseDto {
  @ApiProperty({
    description: 'New JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'New JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.AGENT,
  })
  role: UserRole;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  phoneNo?: string;

  @ApiProperty({
    description: 'User website URL',
    example: 'https://example.com',
    required: false,
  })
  website?: string;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'Email verification status',
    example: false,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'ID of the admin who created this user (if applicable)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  createdBy?: string;
}
