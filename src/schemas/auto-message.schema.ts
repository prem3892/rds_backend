import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AutoMessageDocument = AutoMessage & Document;

@Schema({ timestamps: true })
export class AutoMessage {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'Widget', required: true, index: true })
  widgetId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  domain: string;

  @Prop({ default: false })
  sitewide: boolean;

  @Prop({ type: [String], default: [] })
  pagePaths: string[];

  @Prop({ required: true, min: 0 })
  showAfterSeconds: number;

  @Prop({ default: true })
  isEnabled: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AutoMessageSchema = SchemaFactory.createForClass(AutoMessage);

// Index for efficient querying by widget and domain
AutoMessageSchema.index({ widgetId: 1, domain: 1, isEnabled: 1 });
