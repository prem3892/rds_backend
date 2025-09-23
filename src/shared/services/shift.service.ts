import { Injectable, Logger } from '@nestjs/common';
import { TimeSlot, DayShiftEntry } from '../../schemas/shift.schema';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

@Injectable()
export class ShiftService {
  private readonly logger = new Logger(ShiftService.name);
  /**
   * Check if the current time falls within the agent's working hours
   */
  isAgentAvailable(
    shifts: DayShiftEntry[],
    timezone: string = 'UTC',
    currentTime?: Date,
  ): boolean {
    this.logger.debug(`Checking agent availability for timezone: ${timezone}`);

    if (!shifts || shifts.length === 0) {
      this.logger.debug('No shifts defined, agent is not available');
      return false; // If no shifts defined, agent is not available
    }

    // Convert current time to agent's timezone
    const now = currentTime || new Date();
    const safeTimezone = this.getSafeTimezone(timezone);
    const agentLocalTime = toZonedTime(now, safeTimezone);
    const dayOfWeek = this.getDayOfWeek(agentLocalTime);

    this.logger.debug(
      `Current time in agent timezone (${safeTimezone}): ${format(agentLocalTime, 'yyyy-MM-dd HH:mm:ss')}, Day: ${dayOfWeek}`,
    );

    // Find shifts for the current day of week in agent's timezone
    const dayShifts = shifts.filter(
      (shift) => shift.dayOfWeek === dayOfWeek && shift.isActive !== false,
    );

    this.logger.debug(
      `Found ${dayShifts.length} active shifts for ${dayOfWeek}`,
    );

    if (dayShifts.length === 0) {
      this.logger.debug(
        `No shifts found for ${dayOfWeek}, agent is not available`,
      );
      return false;
    }

    const currentHour = agentLocalTime.getHours();
    const currentMinute = agentLocalTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    this.logger.debug(
      `Current time in minutes: ${currentTimeInMinutes} (${currentHour}:${currentMinute.toString().padStart(2, '0')})`,
    );

    const isAvailable = dayShifts.some((dayShift) => {
      if (
        !dayShift.isWorkingDay ||
        !dayShift.timeSlots ||
        dayShift.timeSlots.length === 0
      ) {
        this.logger.debug(
          `Skipping shift for ${dayOfWeek}: not a working day or no time slots`,
        );
        return false;
      }

      this.logger.debug(
        `Checking ${dayShift.timeSlots.length} time slots for ${dayOfWeek}`,
      );

      return dayShift.timeSlots.some((slot) => {
        const startTimeInMinutes = slot.startHour * 60 + slot.startMinute;
        const endTimeInMinutes = slot.endHour * 60 + slot.endMinute;

        this.logger.debug(
          `Checking time slot: ${slot.startHour}:${slot.startMinute.toString().padStart(2, '0')} - ${slot.endHour}:${slot.endMinute.toString().padStart(2, '0')} (${startTimeInMinutes} - ${endTimeInMinutes} minutes)`,
        );

        // Handle overnight shifts (e.g., 22:00 to 06:00)
        if (endTimeInMinutes < startTimeInMinutes) {
          const isInOvernightShift =
            currentTimeInMinutes >= startTimeInMinutes ||
            currentTimeInMinutes <= endTimeInMinutes;
          this.logger.debug(`Overnight shift check: ${isInOvernightShift}`);
          return isInOvernightShift;
        }

        const isInRegularShift =
          currentTimeInMinutes >= startTimeInMinutes &&
          currentTimeInMinutes <= endTimeInMinutes;
        this.logger.debug(`Regular shift check: ${isInRegularShift}`);
        return isInRegularShift;
      });
    });

    this.logger.log(
      `Agent availability check result: ${isAvailable} for timezone ${timezone} at ${this.getCurrentTimeInTimezone(timezone)}`,
    );
    return isAvailable;
  }

  /**
   * Get the next available time for an agent
   */
  getNextAvailableTime(
    shifts: DayShiftEntry[],
    timezone: string = 'UTC',
    currentTime?: Date,
  ): Date | null {
    this.logger.debug(`Finding next available time for timezone: ${timezone}`);

    if (!shifts || shifts.length === 0) {
      this.logger.debug('No shifts defined, no available time');
      return null; // If no shifts defined, no available time
    }

    const now = currentTime || new Date();
    const safeTimezone = this.getSafeTimezone(timezone);
    const agentLocalTime = toZonedTime(now, safeTimezone);
    const daysToCheck = 7; // Check for the next week
    const activeShifts = shifts.filter((shift) => shift.isActive !== false);

    this.logger.debug(
      `Current time in agent timezone (${safeTimezone}): ${format(agentLocalTime, 'yyyy-MM-dd HH:mm:ss')}`,
    );
    this.logger.debug(
      `Found ${activeShifts.length} active shifts, checking next ${daysToCheck} days`,
    );

    // Sort shifts by priority (higher priority first)
    const sortedShifts = activeShifts.sort(
      (a, b) => (b.priority || 1) - (a.priority || 1),
    );

    this.logger.debug(
      `Shifts sorted by priority: ${sortedShifts.map((s) => `${s.dayOfWeek}(${s.priority || 1})`).join(', ')}`,
    );

    for (let dayOffset = 0; dayOffset < daysToCheck; dayOffset++) {
      const checkDate = new Date(agentLocalTime);
      checkDate.setDate(agentLocalTime.getDate() + dayOffset);

      const dayOfWeek = this.getDayOfWeek(checkDate);
      const checkDateStr = format(checkDate, 'yyyy-MM-dd');

      this.logger.debug(
        `Checking day ${dayOffset + 1}/${daysToCheck}: ${dayOfWeek} (${checkDateStr})`,
      );

      // Find shifts for this day of week, sorted by priority
      const dayShifts = sortedShifts.filter(
        (shift) => shift.dayOfWeek === dayOfWeek && shift.isWorkingDay,
      );

      this.logger.debug(
        `Found ${dayShifts.length} working shifts for ${dayOfWeek}`,
      );

      for (const dayShift of dayShifts) {
        if (dayShift.timeSlots && dayShift.timeSlots.length > 0) {
          this.logger.debug(
            `Checking ${dayShift.timeSlots.length} time slots for ${dayOfWeek} (priority: ${dayShift.priority || 1})`,
          );

          for (const slot of dayShift.timeSlots) {
            // Create slot start time in agent's timezone
            const slotStartLocal = new Date(checkDate);
            slotStartLocal.setHours(slot.startHour, slot.startMinute, 0, 0);

            // Convert to UTC for comparison and return
            const slotStartUTC = fromZonedTime(slotStartLocal, safeTimezone);

            this.logger.debug(
              `Checking slot: ${slot.startHour}:${slot.startMinute.toString().padStart(2, '0')} (UTC: ${slotStartUTC.toISOString()})`,
            );

            // If it's today, make sure the slot hasn't passed
            if (dayOffset === 0 && slotStartUTC <= now) {
              this.logger.debug(`Slot has already passed, skipping`);
              continue;
            }

            this.logger.log(
              `Next available time found: ${slotStartUTC.toISOString()} (${this.getCurrentTimeInTimezone(timezone)} in agent timezone)`,
            );
            return slotStartUTC;
          }
        }
      }
    }

    this.logger.log(
      `No available time found in the next ${daysToCheck} days for timezone ${timezone}`,
    );
    return null; // No available time found in the next week
  }

  /**
   * Validate time slot to ensure end time is after start time
   */
  validateTimeSlot(slot: TimeSlot): boolean {
    const startMinutes = slot.startHour * 60 + slot.startMinute;
    const endMinutes = slot.endHour * 60 + slot.endMinute;

    this.logger.debug(
      `Validating time slot: ${slot.startHour}:${slot.startMinute.toString().padStart(2, '0')} - ${slot.endHour}:${slot.endMinute.toString().padStart(2, '0')}`,
    );

    const isValid = startMinutes !== endMinutes;

    if (!isValid) {
      this.logger.warn(
        `Invalid time slot: start and end times are the same (${startMinutes} minutes)`,
      );
    } else {
      this.logger.debug(`Time slot validation passed: ${isValid}`);
    }

    // Allow overnight shifts
    return isValid;
  }

  /**
   * Validate that time slots don't overlap within a day
   */
  validateDayShiftSlots(timeSlots: TimeSlot[]): boolean {
    this.logger.debug(
      `Validating ${timeSlots?.length || 0} time slots for overlaps`,
    );

    if (!timeSlots || timeSlots.length <= 1) {
      this.logger.debug('No overlaps possible with 0 or 1 time slots');
      return true;
    }

    // Sort slots by start time
    const sortedSlots = [...timeSlots].sort((a, b) => {
      const aStart = a.startHour * 60 + a.startMinute;
      const bStart = b.startHour * 60 + b.startMinute;
      return aStart - bStart;
    });

    this.logger.debug(
      `Sorted time slots: ${sortedSlots.map((s) => `${s.startHour}:${s.startMinute.toString().padStart(2, '0')}-${s.endHour}:${s.endMinute.toString().padStart(2, '0')}`).join(', ')}`,
    );

    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const currentSlot = sortedSlots[i];
      const nextSlot = sortedSlots[i + 1];

      const currentEnd = currentSlot.endHour * 60 + currentSlot.endMinute;
      const nextStart = nextSlot.startHour * 60 + nextSlot.startMinute;

      this.logger.debug(
        `Checking overlap between slot ${i + 1} (ends at ${currentEnd} min) and slot ${i + 2} (starts at ${nextStart} min)`,
      );

      // Check for overlap (considering overnight shifts)
      if (currentEnd > nextStart && currentEnd < 24 * 60) {
        this.logger.warn(
          `Time slot overlap detected: slot ${i + 1} ends at ${currentSlot.endHour}:${currentSlot.endMinute.toString().padStart(2, '0')} but slot ${i + 2} starts at ${nextSlot.startHour}:${nextSlot.startMinute.toString().padStart(2, '0')}`,
        );
        return false;
      }
    }

    this.logger.debug('No time slot overlaps detected');
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
      this.logger.warn(`Invalid timezone "${timezone}", falling back to UTC`);
      return 'UTC';
    }
    this.logger.debug(`Using timezone: ${timezone}`);
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
