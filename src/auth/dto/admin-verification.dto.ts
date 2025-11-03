import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendAdminVerificationDto {
  @ApiProperty({
    description: 'Admin email address to resend verification',
    example: 'admin@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class AdminSignupResponseDto {
  @ApiProperty({
    description: 'Success message',
    example:
      'Admin account created successfully. Please check your email to verify your account.',
  })
  message: string;

  @ApiProperty({
    description: 'Admin user details (without password)',
    example: {
      _id: '507f1f77bcf86cd799439011',
      email: 'admin@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      isEmailVerified: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  user: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phoneNo?: string;
    website?: string;
    isEmailVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}
