import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatMessage,
  ChatMessageDocument,
} from 'src/schemas/chat-message.schema';
import {
  ChatMessageSenderType,
  ChatMessageType,
} from 'src/shared/constants/enums';

interface CreateMessagePayload {
  chatSessionId: Types.ObjectId | string;
  senderId: Types.ObjectId | string;
  senderType: ChatMessageSenderType;
  messageType: ChatMessageType;
  content: Record<string, any>;
}

@Injectable()
export class ChatMessageService {
  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  async createMessage(
    payload: CreateMessagePayload,
  ): Promise<ChatMessageDocument> {
    const newMessage = new this.chatMessageModel({
      ...payload,
      chatSessionId: new Types.ObjectId(payload.chatSessionId),
      senderId: new Types.ObjectId(payload.senderId),
    });
    return newMessage.save();
  }

  async getMessagesForSession(
    chatSessionId: string,
    limit: number = 50,
    page: number = 1, // 1-indexed page
  ): Promise<ChatMessageDocument[]> {
    if (!Types.ObjectId.isValid(chatSessionId)) {
      throw new BadRequestException('Invalid chat session ID format');
    }
    const skip = (page - 1) * limit;
    return this.chatMessageModel
      .find({ chatSessionId: new Types.ObjectId(chatSessionId) })
      .sort({ timestamp: -1 }) // Get latest messages first for typical display
      .skip(skip)
      .limit(limit)
      .exec();
    // For infinite scroll, you might sort by timestamp: 1 and use a cursor
  }

  async markMessagesAsReadByAgent(
    chatSessionId: string,
    upToTimestamp?: Date,
  ): Promise<void> {
    const filter: any = {
      chatSessionId: new Types.ObjectId(chatSessionId),
      senderType: ChatMessageSenderType.CUSTOMER,
      readByAgent: false,
    };
    if (upToTimestamp) {
      filter.timestamp = { $lte: upToTimestamp };
    }
    await this.chatMessageModel
      .updateMany(filter, { $set: { readByAgent: true } })
      .exec();
  }

  async markMessagesAsReadByCustomer(
    chatSessionId: string,
    upToTimestamp?: Date,
  ): Promise<void> {
    const filter: any = {
      chatSessionId: new Types.ObjectId(chatSessionId),
      senderType: ChatMessageSenderType.AGENT,
      readByCustomer: false,
    };
    if (upToTimestamp) {
      filter.timestamp = { $lte: upToTimestamp };
    }
    await this.chatMessageModel
      .updateMany(filter, { $set: { readByCustomer: true } })
      .exec();
  }
}
