import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { TimeSlotDto } from '../dto/shift.dto';

@ValidatorConstraint({ name: 'isValidTimeSlot', async: false })
export class IsValidTimeSlotConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    // Handle both property-level and class-level validation
    let timeSlot: TimeSlotDto;

    if (args.property === 'timeSlotValidation') {
      // Class-level validation - value is the entire object
      timeSlot = value as TimeSlotDto;
    } else {
      // Property-level validation - value is the property value
      timeSlot = value as TimeSlotDto;
    }

    if (!timeSlot) return true; // Let other validators handle required validation

    const { startHour, startMinute, endHour, endMinute } = timeSlot;

    // Check if all required properties exist
    if (
      startHour === undefined ||
      startMinute === undefined ||
      endHour === undefined ||
      endMinute === undefined
    ) {
      return true; // Let other validators handle required validation
    }

    // Basic range validation
    if (
      startHour < 0 ||
      startHour > 23 ||
      startMinute < 0 ||
      startMinute > 59 ||
      endHour < 0 ||
      endHour > 23 ||
      endMinute < 0 ||
      endMinute > 59
    ) {
      return false;
    }

    // Ensure start and end times are different
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return startMinutes !== endMinutes;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Time slot must have valid hours (0-23), minutes (0-59), and start time must be different from end time';
  }
}

@ValidatorConstraint({ name: 'noOverlappingTimeSlots', async: false })
export class NoOverlappingTimeSlotsConstraint
  implements ValidatorConstraintInterface
{
  validate(timeSlots: TimeSlotDto[], args: ValidationArguments) {
    if (!timeSlots || timeSlots.length <= 1) return true;

    // Sort slots by start time
    const sortedSlots = [...timeSlots].sort((a, b) => {
      const aStart = a.startHour * 60 + a.startMinute;
      const bStart = b.startHour * 60 + b.startMinute;
      return aStart - bStart;
    });

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentSlot = sortedSlots[i];
      const nextSlot = sortedSlots[i + 1];

      const currentEnd = currentSlot.endHour * 60 + currentSlot.endMinute;
      const nextStart = nextSlot.startHour * 60 + nextSlot.startMinute;

      // Check for overlap (not considering overnight shifts for simplicity)
      if (currentEnd > nextStart && currentEnd < 24 * 60) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Time slots cannot overlap within the same day';
  }
}

export function IsValidTimeSlot(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName?: string) {
    // If propertyName is undefined, this is being used as a class decorator
    if (propertyName === undefined) {
      // Class decorator - validate the entire object
      registerDecorator({
        target: object,
        propertyName: 'timeSlotValidation',
        options: validationOptions,
        constraints: [],
        validator: IsValidTimeSlotConstraint,
      });
    } else {
      // Property decorator - validate a specific property
      registerDecorator({
        target: object.constructor,
        propertyName: propertyName,
        options: validationOptions,
        constraints: [],
        validator: IsValidTimeSlotConstraint,
      });
    }
  };
}

export function NoOverlappingTimeSlots(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoOverlappingTimeSlotsConstraint,
    });
  };
}
