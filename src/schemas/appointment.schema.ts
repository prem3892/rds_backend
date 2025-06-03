import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppointmentStatus } from 'src/shared/constants/enums';

export type AppointmentDocument = Appointment & Document;

@Schema({ timestamps: true })
export class Appointment {
  _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ChatSession',
    required: true,
    index: true,
  })
  chatSessionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true }) // Agent User ID
  agentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  appointmentTime: Date;

  @Prop({ trim: true })
  notes?: string;

  @Prop({
    type: String,
    enum: AppointmentStatus,
    default: AppointmentStatus.SCHEDULED,
  })
  status: AppointmentStatus;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
