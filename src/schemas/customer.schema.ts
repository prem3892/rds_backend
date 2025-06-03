import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  fingerprint: string; // Browser fingerprint

  @Prop({ trim: true })
  name?: string;

  @Prop({ index: true, lowercase: true, trim: true })
  email?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // e.g., browser, OS, current page URL

  @Prop({ type: Types.ObjectId, ref: 'Widget', required: true })
  widgetId: Types.ObjectId;

  @Prop()
  createdAt: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ fingerprint: 1, widgetId: 1 });
