import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShiftDocument = Shift & Document;

@Schema({ _id: false })
export class TimeSlot {
  @Prop({ required: true, min: 0, max: 23 })
  startHour: number;

  @Prop({ required: true, min: 0, max: 59 })
  startMinute: number;

  @Prop({ required: true, min: 0, max: 23 })
  endHour: number;

  @Prop({ required: true, min: 0, max: 59 })
  endMinute: number;
}

export const TimeSlotSchema = SchemaFactory.createForClass(TimeSlot);

@Schema({ _id: false })
export class DayShift {
  @Prop({ default: false })
  isWorkingDay: boolean;

  @Prop({ type: [TimeSlotSchema], default: [] })
  timeSlots: TimeSlot[];
}

export const DayShiftSchema = SchemaFactory.createForClass(DayShift);

@Schema({ _id: false })
export class WeeklyShift {
  @Prop({
    type: DayShiftSchema,
    default: () => ({ isWorkingDay: false, timeSlots: [] }),
  })
  monday: DayShift;

  @Prop({
    type: DayShiftSchema,
    default: () => ({ isWorkingDay: false, timeSlots: [] }),
  })
  tuesday: DayShift;

  @Prop({
    type: DayShiftSchema,
    default: () => ({ isWorkingDay: false, timeSlots: [] }),
  })
  wednesday: DayShift;

  @Prop({
    type: DayShiftSchema,
    default: () => ({ isWorkingDay: false, timeSlots: [] }),
  })
  thursday: DayShift;

  @Prop({
    type: DayShiftSchema,
    default: () => ({ isWorkingDay: false, timeSlots: [] }),
  })
  friday: DayShift;

  @Prop({
    type: DayShiftSchema,
    default: () => ({ isWorkingDay: false, timeSlots: [] }),
  })
  saturday: DayShift;

  @Prop({
    type: DayShiftSchema,
    default: () => ({ isWorkingDay: false, timeSlots: [] }),
  })
  sunday: DayShift;
}

export const WeeklyShiftSchema = SchemaFactory.createForClass(WeeklyShift);

@Schema({ _id: false })
export class DayShiftEntry {
  @Prop({
    required: true,
    enum: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
  })
  dayOfWeek: string;

  @Prop({ default: false })
  isWorkingDay: boolean;

  @Prop({ type: [TimeSlotSchema], default: [] })
  timeSlots: TimeSlot[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 1, min: 1, max: 10 })
  priority: number;

  @Prop({ trim: true })
  description?: string;
}

export const DayShiftEntrySchema = SchemaFactory.createForClass(DayShiftEntry);

@Schema({ _id: false })
export class NamedShift {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: WeeklyShiftSchema, required: true })
  weeklySchedule: WeeklyShift;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 1, min: 1, max: 10 })
  priority: number;

  @Prop({ trim: true })
  description?: string;
}

export const NamedShiftSchema = SchemaFactory.createForClass(NamedShift);

@Schema({ timestamps: true })
export class Shift {
  @Prop({ type: [NamedShiftSchema], default: [] })
  shifts: NamedShift[];

  @Prop({ default: 'UTC' })
  timezone: string;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
