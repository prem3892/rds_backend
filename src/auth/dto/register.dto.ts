import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole } from 'src/shared/constants/enums';
import { DayShiftEntryDto } from './shift.dto';

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

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  phoneNo?: string;

  @ApiProperty({
    description: 'User website URL',
    example: 'https://example.com',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({
    description: 'Agent working hours schedule (only applicable for agents)',
    type: [DayShiftEntryDto],
    required: false,
    example: [
      {
        dayOfWeek: 'monday',
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
        isActive: true,
        priority: 1,
        description: 'Regular Monday hours',
      },
      {
        dayOfWeek: 'tuesday',
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
        isActive: true,
        priority: 1,
        description: 'Regular Tuesday hours',
      },
      {
        dayOfWeek: 'wednesday',
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
        isActive: true,
        priority: 1,
        description: 'Regular Wednesday hours',
      },
      {
        dayOfWeek: 'thursday',
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
        isActive: true,
        priority: 1,
        description: 'Regular Thursday hours',
      },
      {
        dayOfWeek: 'friday',
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
        isActive: true,
        priority: 1,
        description: 'Regular Friday hours',
      },
      {
        dayOfWeek: 'saturday',
        isWorkingDay: false,
        timeSlots: [],
        isActive: false,
        priority: 1,
        description: 'Weekend - not working',
      },
      {
        dayOfWeek: 'sunday',
        isWorkingDay: false,
        timeSlots: [],
        isActive: false,
        priority: 1,
        description: 'Weekend - not working',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DayShiftEntryDto)
  shifts?: DayShiftEntryDto[];

  @ApiProperty({
    description: 'Timezone for the agent shifts (IANA timezone identifier)',
    example: 'America/New_York',
    required: false,
    examples: {
      utc: {
        summary: 'UTC Timezone',
        value: 'UTC',
      },
      eastern: {
        summary: 'Eastern Time',
        value: 'America/New_York',
      },
      pacific: {
        summary: 'Pacific Time',
        value: 'America/Los_Angeles',
      },
      london: {
        summary: 'London Time',
        value: 'Europe/London',
      },
    },
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
