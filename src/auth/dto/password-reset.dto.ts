import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Email address of the user requesting password reset',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      'Whether the request is from mobile app. If true, OTP will be sent instead of reset link.',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_mobile?: boolean;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'New password for the user account',
    example: 'newSecurePassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'xyz789abc123...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResetPasswordWithOtpDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'OTP received via email',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({
    description: 'New password for the user account',
    example: 'newSecurePassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}
