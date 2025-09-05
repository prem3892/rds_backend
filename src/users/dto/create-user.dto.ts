import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../shared/constants/enums';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  @IsNotEmpty({ message: 'Email is required.' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required.' })
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  lastName: string;

  @IsEnum(UserRole, { message: 'Invalid role specified.' })
  @IsNotEmpty({ message: 'Role is required.' })
  role: UserRole;

  @IsOptional()
  @IsString({ message: 'Phone number must be a string.' })
  phoneNo?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL.' })
  website?: string;

  @IsOptional()
  @IsBoolean({ message: 'Email verification status must be a boolean.' })
  isEmailVerified?: boolean;
}
