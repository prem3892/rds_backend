/**
 * Utility for formatting dates without timezone conversion
 * Treats dates as "floating" or "naive" datetimes
 */
export class DateFormatterUtil {
  /**
   * Format a Date object to string without timezone conversion
   * Uses local time components to preserve exact date/time values
   *
   * @param date - The Date object to format
   * @returns Formatted string in format: YYYY-MM-DDTHH:mm:ss
   */
  static formatWithoutTimezone(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  /**
   * Format a Date object to human-readable string without timezone conversion
   *
   * @param date - The Date object to format
   * @returns Formatted string in format: YYYY-MM-DD HH:mm
   */
  static formatHumanReadable(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  /**
   * Parse a date string without timezone conversion
   * Handles formats: YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss
   *
   * @param dateStr - The date string to parse
   * @returns Date object with local time values preserved
   */
  static parseWithoutTimezone(dateStr: string): Date {
    // If the date string doesn't have timezone info, treat it as-is
    if (
      !dateStr.endsWith('Z') &&
      !dateStr.includes('+') &&
      !dateStr.includes('T')
    ) {
      // Format: YYYY-MM-DD HH:mm:ss or similar without T
      return new Date(dateStr);
    } else if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
      // Format: 2024-10-03T15:00:00 (no timezone)
      // Parse components to avoid timezone conversion
      const parts = dateStr.split('T');
      const dateParts = parts[0].split('-');
      const timeParts = parts[1] ? parts[1].split(':') : ['0', '0', '0'];

      return new Date(
        parseInt(dateParts[0]), // year
        parseInt(dateParts[1]) - 1, // month (0-indexed)
        parseInt(dateParts[2]), // day
        parseInt(timeParts[0]), // hours
        parseInt(timeParts[1]), // minutes
        parseInt(timeParts[2] || '0'), // seconds
      );
    } else {
      // Has timezone info, use as-is
      return new Date(dateStr);
    }
  }
}
