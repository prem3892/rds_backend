import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

export type DepartmentDocument = Department & Document;

@Schema({ timestamps: true })
export class Department {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId | User;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
