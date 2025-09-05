import { Test, TestingModule } from '@nestjs/testing';
import { ShiftService } from './shift.service';
import { WeeklyShift, TimeSlot } from '../../schemas/shift.schema';

describe('ShiftService', () => {
  let service: ShiftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftService],
    }).compile();

    service = module.get<ShiftService>(ShiftService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isAgentAvailable', () => {
    const mockShifts: WeeklyShift = {
      monday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
      tuesday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 12, endMinute: 0 },
          { startHour: 13, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
      wednesday: {
        isWorkingDay: false,
        timeSlots: [],
      },
      thursday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 22, startMinute: 0, endHour: 6, endMinute: 0 }, // Overnight shift
        ],
      },
      friday: {
        isWorkingDay: true,
        timeSlots: [
          { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
        ],
      },
      saturday: {
        isWorkingDay: false,
        timeSlots: [],
      },
      sunday: {
        isWorkingDay: false,
        timeSlots: [],
      },
    };

    it('should return true when agent is within working hours', () => {
      // Monday 10:00 AM
      const mondayMorning = new Date('2024-01-15T10:00:00Z'); // Monday
      mondayMorning.setDay(1); // Ensure it's Monday

      const result = service.isAgentAvailable(mockShifts, 'UTC', mondayMorning);
      expect(result).toBe(true);
    });

    it('should return false when agent is outside working hours', () => {
      // Monday 8:00 AM (before work starts)
      const mondayEarly = new Date('2024-01-15T08:00:00Z');
      mondayEarly.setDay(1); // Ensure it's Monday

      const result = service.isAgentAvailable(mockShifts, 'UTC', mondayEarly);
      expect(result).toBe(false);
    });

    it('should return false on non-working days', () => {
      // Wednesday (non-working day)
      const wednesday = new Date('2024-01-17T10:00:00Z');
      wednesday.setDay(3); // Ensure it's Wednesday

      const result = service.isAgentAvailable(mockShifts, 'UTC', wednesday);
      expect(result).toBe(false);
    });

    it('should handle split shifts correctly', () => {
      // Tuesday 11:00 AM (within first slot)
      const tuesdayMorning = new Date('2024-01-16T11:00:00Z');
      tuesdayMorning.setDay(2); // Ensure it's Tuesday

      const result1 = service.isAgentAvailable(
        mockShifts,
        'UTC',
        tuesdayMorning,
      );
      expect(result1).toBe(true);

      // Tuesday 12:30 PM (lunch break - between slots)
      const tuesdayLunch = new Date('2024-01-16T12:30:00Z');
      tuesdayLunch.setDay(2); // Ensure it's Tuesday

      const result2 = service.isAgentAvailable(mockShifts, 'UTC', tuesdayLunch);
      expect(result2).toBe(false);

      // Tuesday 2:00 PM (within second slot)
      const tuesdayAfternoon = new Date('2024-01-16T14:00:00Z');
      tuesdayAfternoon.setDay(2); // Ensure it's Tuesday

      const result3 = service.isAgentAvailable(
        mockShifts,
        'UTC',
        tuesdayAfternoon,
      );
      expect(result3).toBe(true);
    });

    it('should handle overnight shifts correctly', () => {
      // Thursday 11:00 PM (start of overnight shift)
      const thursdayNight = new Date('2024-01-18T23:00:00Z');
      thursdayNight.setDay(4); // Ensure it's Thursday

      const result1 = service.isAgentAvailable(
        mockShifts,
        'UTC',
        thursdayNight,
      );
      expect(result1).toBe(true);

      // Friday 3:00 AM (during overnight shift)
      const fridayEarly = new Date('2024-01-19T03:00:00Z');
      fridayEarly.setDay(5); // Ensure it's Friday

      const result2 = service.isAgentAvailable(mockShifts, 'UTC', fridayEarly);
      expect(result2).toBe(true);
    });

    it('should return true when no shifts are defined', () => {
      const result = service.isAgentAvailable(null, 'UTC', new Date());
      expect(result).toBe(true);
    });
  });

  describe('validateTimeSlot', () => {
    it('should validate correct time slots', () => {
      const validSlot: TimeSlot = {
        startHour: 9,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
      };

      const result = service.validateTimeSlot(validSlot);
      expect(result).toBe(true);
    });

    it('should reject time slots with same start and end time', () => {
      const invalidSlot: TimeSlot = {
        startHour: 9,
        startMinute: 0,
        endHour: 9,
        endMinute: 0,
      };

      const result = service.validateTimeSlot(invalidSlot);
      expect(result).toBe(false);
    });

    it('should allow overnight shifts', () => {
      const overnightSlot: TimeSlot = {
        startHour: 22,
        startMinute: 0,
        endHour: 6,
        endMinute: 0,
      };

      const result = service.validateTimeSlot(overnightSlot);
      expect(result).toBe(true);
    });
  });

  describe('validateDayShiftSlots', () => {
    it('should validate non-overlapping slots', () => {
      const validSlots: TimeSlot[] = [
        { startHour: 9, startMinute: 0, endHour: 12, endMinute: 0 },
        { startHour: 13, startMinute: 0, endHour: 17, endMinute: 0 },
      ];

      const result = service.validateDayShiftSlots(validSlots);
      expect(result).toBe(true);
    });

    it('should reject overlapping slots', () => {
      const overlappingSlots: TimeSlot[] = [
        { startHour: 9, startMinute: 0, endHour: 13, endMinute: 0 },
        { startHour: 12, startMinute: 0, endHour: 17, endMinute: 0 },
      ];

      const result = service.validateDayShiftSlots(overlappingSlots);
      expect(result).toBe(false);
    });

    it('should handle single slot', () => {
      const singleSlot: TimeSlot[] = [
        { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 },
      ];

      const result = service.validateDayShiftSlots(singleSlot);
      expect(result).toBe(true);
    });

    it('should handle empty slots', () => {
      const result = service.validateDayShiftSlots([]);
      expect(result).toBe(true);
    });
  });
});
