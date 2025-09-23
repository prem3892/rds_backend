import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DayShiftEntry, DayShiftEntrySchema } from './shift.schema';
import { Department, DepartmentDocument } from './department.schema';

export type AgentProfileDocument = AgentProfile & Document;

@Schema({ timestamps: false })
export class AgentProfile {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    unique: true,
    index: true,
    required: true,
  })
  userId: Types.ObjectId; // aka agentId :)

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    index: true,
    required: true,
  })
  adminId: Types.ObjectId;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Department' }],
    index: true,
    default: [],
  })
  departmentIds: Types.ObjectId[] | DepartmentDocument[];

  @Prop({ type: [String], index: true, default: ['*'] })
  domainAccess: string[]; // Can be "*"

  @Prop({ default: false, index: true })
  isOnline: boolean;

  @Prop({ default: false, index: true })
  isBlocked: boolean;

  @Prop({ default: 100 })
  maxConcurrentChats: number;

  @Prop()
  lastSeen?: Date;

  @Prop({ type: [DayShiftEntrySchema], default: [] })
  shifts: DayShiftEntry[];

  @Prop({ default: 'America/Los_Angeles' })
  timezone: string;

  @Prop()
  profilePicture?: string; // File path/URL for profile picture
}

export const AgentProfileSchema = SchemaFactory.createForClass(AgentProfile);
