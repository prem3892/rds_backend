import { Injectable } from '@nestjs/common';
import { WeeklyShift, TimeSlot } from '../../schemas/shift.schema';

@Injectable()
export class ShiftService {
  /**
   * Check if the current time falls within the agent's working hours
   */
  isAgentAvailable(
    shifts: WeeklyShift,
    timezone: string = 'UTC',
    currentTime?: Date,
  ): boolean {
    if (!shifts) {
      return true; // If no shifts defined, assume always available
    }

    const now = currentTime || new Date();
    const dayOfWeek = this.getDayOfWeek(now);
    const dayShift = this.getDayShift(shifts, dayOfWeek);

    if (!dayShift || !dayShift.isWorkingDay) {
      return false;
    }

    if (!dayShift.timeSlots || dayShift.timeSlots.length === 0) {
      return false;
    }

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    return dayShift.timeSlots.some((slot) => {
      const startTimeInMinutes = slot.startHour * 60 + slot.startMinute;
      const endTimeInMinutes = slot.endHour * 60 + slot.endMinute;

      // Handle overnight shifts (e.g., 22:00 to 06:00)
      if (endTimeInMinutes < startTimeInMinutes) {
        return (
          currentTimeInMinutes >= startTimeInMinutes ||
          currentTimeInMinutes <= endTimeInMinutes
        );
      }

      return (
        currentTimeInMinutes >= startTimeInMinutes &&
        currentTimeInMinutes <= endTimeInMinutes
      );
    });
  }

  /**
   * Get the next available time for an agent
   */
  getNextAvailableTime(
    shifts: WeeklyShift,
    timezone: string = 'UTC',
    currentTime?: Date,
  ): Date | null {
    if (!shifts) {
      return null; // If no shifts defined, assume always available
    }

    const now = currentTime || new Date();
    const daysToCheck = 7; // Check for the next week

    for (let dayOffset = 0; dayOffset < daysToCheck; dayOffset++) {
      const checkDate = new Date(now);
      checkDate.setDate(now.getDate() + dayOffset);

      const dayOfWeek = this.getDayOfWeek(checkDate);
      const dayShift = this.getDayShift(shifts, dayOfWeek);

      if (dayShift && dayShift.isWorkingDay && dayShift.timeSlots) {
        for (const slot of dayShift.timeSlots) {
          const slotStart = new Date(checkDate);
          slotStart.setHours(slot.startHour, slot.startMinute, 0, 0);

          // If it's today, make sure the slot hasn't passed
          if (dayOffset === 0 && slotStart <= now) {
            continue;
          }

          return slotStart;
        }
      }
    }

    return null; // No available time found in the next week
  }

  /**
   * Validate time slot to ensure end time is after start time
   */
  validateTimeSlot(slot: TimeSlot): boolean {
    const startMinutes = slot.startHour * 60 + slot.startMinute;
    const endMinutes = slot.endHour * 60 + slot.endMinute;

    // Allow overnight shifts
    return startMinutes !== endMinutes;
  }

  /**
   * Validate that time slots don't overlap within a day
   */
  validateDayShiftSlots(timeSlots: TimeSlot[]): boolean {
    if (!timeSlots || timeSlots.length <= 1) {
      return true;
    }

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

      // Check for overlap (considering overnight shifts)
      if (currentEnd > nextStart && currentEnd < 24 * 60) {
        return false;
      }
    }

    return true;
  }

  private getDayOfWeek(date: Date): string {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return days[date.getDay()];
  }

  private getDayShift(shifts: WeeklyShift, dayOfWeek: string) {
    switch (dayOfWeek) {
      case 'monday':
        return shifts.monday;
      case 'tuesday':
        return shifts.tuesday;
      case 'wednesday':
        return shifts.wednesday;
      case 'thursday':
        return shifts.thursday;
      case 'friday':
        return shifts.friday;
      case 'saturday':
        return shifts.saturday;
      case 'sunday':
        return shifts.sunday;
      default:
        return null;
    }
  }
}
