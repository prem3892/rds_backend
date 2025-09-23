import { Injectable } from '@nestjs/common';
import { TimeSlot, DayShiftEntry } from '../../schemas/shift.schema';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

@Injectable()
export class ShiftService {
  /**
   * Check if the current time falls within the agent's working hours
   */
  isAgentAvailable(
    shifts: DayShiftEntry[],
    timezone: string = 'UTC',
    currentTime?: Date,
  ): boolean {
    if (!shifts || shifts.length === 0) {
      return false; // If no shifts defined, agent is not available
    }

    // Convert current time to agent's timezone
    const now = currentTime || new Date();
    const safeTimezone = this.getSafeTimezone(timezone);
    const agentLocalTime = toZonedTime(now, safeTimezone);
    const dayOfWeek = this.getDayOfWeek(agentLocalTime);

    // Find shifts for the current day of week in agent's timezone
    const dayShifts = shifts.filter(
      (shift) => shift.dayOfWeek === dayOfWeek && shift.isActive !== false,
    );

    if (dayShifts.length === 0) {
      return false;
    }

    const currentHour = agentLocalTime.getHours();
    const currentMinute = agentLocalTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    return dayShifts.some((dayShift) => {
      if (
        !dayShift.isWorkingDay ||
        !dayShift.timeSlots ||
        dayShift.timeSlots.length === 0
      ) {
        return false;
      }

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
    });
  }

  /**
   * Get the next available time for an agent
   */
  getNextAvailableTime(
    shifts: DayShiftEntry[],
    timezone: string = 'UTC',
    currentTime?: Date,
  ): Date | null {
    if (!shifts || shifts.length === 0) {
      return null; // If no shifts defined, no available time
    }

    const now = currentTime || new Date();
    const safeTimezone = this.getSafeTimezone(timezone);
    const agentLocalTime = toZonedTime(now, safeTimezone);
    const daysToCheck = 7; // Check for the next week
    const activeShifts = shifts.filter((shift) => shift.isActive !== false);

    // Sort shifts by priority (higher priority first)
    const sortedShifts = activeShifts.sort(
      (a, b) => (b.priority || 1) - (a.priority || 1),
    );

    for (let dayOffset = 0; dayOffset < daysToCheck; dayOffset++) {
      const checkDate = new Date(agentLocalTime);
      checkDate.setDate(agentLocalTime.getDate() + dayOffset);

      const dayOfWeek = this.getDayOfWeek(checkDate);

      // Find shifts for this day of week, sorted by priority
      const dayShifts = sortedShifts.filter(
        (shift) => shift.dayOfWeek === dayOfWeek && shift.isWorkingDay,
      );

      for (const dayShift of dayShifts) {
        if (dayShift.timeSlots && dayShift.timeSlots.length > 0) {
          for (const slot of dayShift.timeSlots) {
            // Create slot start time in agent's timezone
            const slotStartLocal = new Date(checkDate);
            slotStartLocal.setHours(slot.startHour, slot.startMinute, 0, 0);

            // Convert to UTC for comparison and return
            const slotStartUTC = fromZonedTime(slotStartLocal, safeTimezone);

            // If it's today, make sure the slot hasn't passed
            if (dayOffset === 0 && slotStartUTC <= now) {
              continue;
            }

            return slotStartUTC;
          }
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

  /**
   * Validate if the timezone string is valid
   */
  private isValidTimezone(timezone: string): boolean {
    try {
      // Try to create a date in the timezone to validate it
      toZonedTime(new Date(), timezone);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a safe timezone, fallback to UTC if invalid
   */
  private getSafeTimezone(timezone: string): string {
    if (!timezone || !this.isValidTimezone(timezone)) {
      console.warn(`Invalid timezone "${timezone}", falling back to UTC`);
      return 'UTC';
    }
    return timezone;
  }

  /**
   * Get current time in agent's timezone (for debugging/logging)
   */
  getCurrentTimeInTimezone(timezone: string = 'UTC'): string {
    const safeTimezone = this.getSafeTimezone(timezone);
    const now = new Date();
    const localTime = toZonedTime(now, safeTimezone);
    return format(localTime, 'yyyy-MM-dd HH:mm:ss zzz', {
      timeZone: safeTimezone,
    });
  }
}
