import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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
  userId: Types.ObjectId;

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
  departmentIds: Types.ObjectId[];

  @Prop({ type: [String], index: true, default: [] })
  domainAccess: string[]; // Can be "*"

  @Prop({ default: false, index: true })
  isOnline: boolean;

  @Prop({ default: 3 })
  maxConcurrentChats: number;

  @Prop()
  lastSeen?: Date;
}

export const AgentProfileSchema = SchemaFactory.createForClass(AgentProfile);
