import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123',
  })
  @IsString()
  @MinLength(1, { message: 'Current password is required.' })
  oldPassword: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters)',
    example: 'newSecurePassword123',
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  newPassword: string;
}
