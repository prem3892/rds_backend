import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ChatSessionStatus } from 'src/shared/constants/enums';
import { CustomerDocument } from './customer.schema';

export interface AgentHistory {
  agentId: Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}

export type ChatSessionDocument = ChatSession & Document;

@Schema({ timestamps: true })
export class ChatSession {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Widget', required: true, index: true })
  widgetId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId: Types.ObjectId | CustomerDocument;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true, default: null })
  agentId?: Types.ObjectId; // Current Agent User ID

  @Prop([
    {
      agentId: { type: Types.ObjectId, ref: 'User', required: true },
      joinedAt: { type: Date, required: true },
      leftAt: { type: Date, required: false },
      isActive: { type: Boolean, default: true },
    },
  ])
  agentHistory: AgentHistory[]; // History of all agents who handled this chat

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
  departmentId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ChatSessionStatus,
    default: ChatSessionStatus.PENDING_ASSIGNMENT,
    index: true,
  })
  status: ChatSessionStatus;

  @Prop({ default: Date.now })
  initiatedAt: Date;

  @Prop({ default: null })
  acceptedAt?: Date;

  @Prop({ default: null })
  endedAt?: Date;

  @Prop()
  lastMessageAt?: Date;

  @Prop()
  customerLastSeen?: Date;

  @Prop()
  agentLastSeen?: Date;

  @Prop({ trim: true })
  initialMessage?: string;

  @Prop({ required: true })
  domain: string;

  @Prop({ default: 0 })
  priorityNotificationSentCount: number;

  @Prop()
  lastPriorityNotificationSentAt?: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
