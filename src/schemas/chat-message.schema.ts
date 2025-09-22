import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ChatMessageSenderType,
  ChatMessageType,
} from 'src/shared/constants/enums';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: { createdAt: 'timestamp' } }) // Use 'timestamp' for createdAt
export class ChatMessage {
  _id: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'ChatSession',
    required: true,
    index: true,
  })
  chatSessionId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  }) // Refers to User._id or Customer._id
  senderId: Types.ObjectId;

  @Prop({ type: String, enum: ChatMessageSenderType, required: true })
  senderType: ChatMessageSenderType;

  @Prop({ type: String, enum: ChatMessageType, required: true })
  messageType: ChatMessageType;

  @Prop({ type: Object, required: true })
  content: Record<string, any>; // Flexible content based on messageType

  @Prop({ index: true })
  timestamp: Date; // Automatically managed by Mongoose timestamps

  @Prop({ default: false })
  readByAgent: boolean;

  @Prop({ default: false })
  readByCustomer: boolean;

  // Virtual field
  agentInfo?: {
    fullName?: string;
    profilePicture?: string;
  };
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// Virtual field for agent information - populated manually in service
ChatMessageSchema.virtual('agentInfo');

// Compound index for efficient unread count queries (customer messages only)
ChatMessageSchema.index({ chatSessionId: 1, senderType: 1, readByAgent: 1 });

// Ensure virtual fields are included in JSON output
ChatMessageSchema.set('toJSON', { virtuals: true });
ChatMessageSchema.set('toObject', { virtuals: true });
