import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IsValidTimeSlot,
  NoOverlappingTimeSlots,
} from '../validators/shift.validator';

export class TimeSlotDto {
  @ApiProperty({
    description: 'Start hour in 24-hour format (0-23)',
    example: 9,
    minimum: 0,
    maximum: 23,
  })
  @IsNumber()
  @Min(0)
  @Max(23)
  startHour: number;

  @ApiProperty({
    description: 'Start minute (0-59)',
    example: 0,
    minimum: 0,
    maximum: 59,
  })
  @IsNumber()
  @Min(0)
  @Max(59)
  startMinute: number;

  @ApiProperty({
    description: 'End hour in 24-hour format (0-23)',
    example: 17,
    minimum: 0,
    maximum: 23,
  })
  @IsNumber()
  @Min(0)
  @Max(23)
  endHour: number;

  @ApiProperty({
    description: 'End minute (0-59)',
    example: 0,
    minimum: 0,
    maximum: 59,
  })
  @IsNumber()
  @Min(0)
  @Max(59)
  endMinute: number;
}

// Apply validation to the entire TimeSlotDto
@IsValidTimeSlot()
export class ValidatedTimeSlotDto extends TimeSlotDto {}

export class DayShiftDto {
  @ApiProperty({
    description: 'Whether this is a working day for the agent',
    example: true,
  })
  @IsBoolean()
  isWorkingDay: boolean;

  @ApiProperty({
    description:
      'Time slots for the day. Multiple non-overlapping slots can be defined for breaks (e.g., morning and afternoon shifts)',
    type: [TimeSlotDto],
    required: false,
    example: [
      { startHour: 9, startMinute: 0, endHour: 12, endMinute: 0 },
      { startHour: 13, startMinute: 0, endHour: 17, endMinute: 0 },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  @NoOverlappingTimeSlots()
  timeSlots?: TimeSlotDto[];
}

export class WeeklyShiftDto {
  @ApiProperty({
    description: 'Monday shift schedule',
    type: DayShiftDto,
    required: false,
    example: {
      isWorkingDay: true,
      timeSlots: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  monday?: DayShiftDto;

  @ApiProperty({
    description: 'Tuesday shift schedule',
    type: DayShiftDto,
    required: false,
    example: {
      isWorkingDay: true,
      timeSlots: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  tuesday?: DayShiftDto;

  @ApiProperty({
    description: 'Wednesday shift schedule',
    type: DayShiftDto,
    required: false,
    example: {
      isWorkingDay: true,
      timeSlots: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  wednesday?: DayShiftDto;

  @ApiProperty({
    description: 'Thursday shift schedule',
    type: DayShiftDto,
    required: false,
    example: {
      isWorkingDay: true,
      timeSlots: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  thursday?: DayShiftDto;

  @ApiProperty({
    description: 'Friday shift schedule',
    type: DayShiftDto,
    required: false,
    example: {
      isWorkingDay: true,
      timeSlots: [{ startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  friday?: DayShiftDto;

  @ApiProperty({
    description: 'Saturday shift schedule',
    type: DayShiftDto,
    required: false,
    example: { isWorkingDay: false, timeSlots: [] },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  saturday?: DayShiftDto;

  @ApiProperty({
    description: 'Sunday shift schedule',
    type: DayShiftDto,
    required: false,
    example: { isWorkingDay: false, timeSlots: [] },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayShiftDto)
  sunday?: DayShiftDto;
}

export class ShiftDto {
  @ApiProperty({
    description:
      'Weekly shift schedule defining working hours for each day of the week',
    type: WeeklyShiftDto,
    example: {
      monday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
      tuesday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
      wednesday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
      thursday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
      friday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
      saturday: { isWorkingDay: false, timeSlots: [] },
      sunday: { isWorkingDay: false, timeSlots: [] },
    },
  })
  @ValidateNested()
  @Type(() => WeeklyShiftDto)
  weeklySchedule: WeeklyShiftDto;

  @ApiProperty({
    description: 'Timezone for the shifts (IANA timezone identifier)',
    example: 'America/New_York',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
