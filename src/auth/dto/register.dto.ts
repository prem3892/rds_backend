import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/shared/constants/enums';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'agent@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'securePassword123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.AGENT,
    enumName: 'UserRole',
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
