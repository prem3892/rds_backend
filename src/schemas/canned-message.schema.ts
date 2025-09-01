import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CannedMessageDocument = CannedMessage & Document;

@Schema({ timestamps: true })
export class CannedMessage {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  agentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  adminId: Types.ObjectId;

  @Prop({ default: false })
  isGlobal: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Department' }], default: [] })
  departmentIds: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const CannedMessageSchema = SchemaFactory.createForClass(CannedMessage);

// Add indexes for better query performance
CannedMessageSchema.index({ agentId: 1 });
CannedMessageSchema.index({ adminId: 1 });
CannedMessageSchema.index({ isGlobal: 1 });
CannedMessageSchema.index({ departmentIds: 1 });
CannedMessageSchema.index({ tags: 1 });
CannedMessageSchema.index({ title: 'text', content: 'text' });
