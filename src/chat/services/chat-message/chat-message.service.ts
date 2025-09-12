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

    // Get messages with aggregation to join agent info
    const messages = await this.chatMessageModel.aggregate([
      {
        $match: {
          chatSessionId: new Types.ObjectId(chatSessionId),
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: 'senderId',
          foreignField: '_id',
          as: 'agentUser',
          pipeline: [{ $project: { firstName: 1, lastName: 1 } }],
        },
      },
      {
        $lookup: {
          from: 'agentprofiles',
          localField: 'senderId',
          foreignField: 'userId',
          as: 'agentProfile',
          pipeline: [{ $project: { profilePicture: 1 } }],
        },
      },
      {
        $addFields: {
          agentInfo: {
            $cond: {
              if: { $eq: ['$senderType', 'AGENT'] },
              then: {
                $let: {
                  vars: {
                    user: { $arrayElemAt: ['$agentUser', 0] },
                    profile: { $arrayElemAt: ['$agentProfile', 0] },
                  },
                  in: {
                    fullName: {
                      $trim: {
                        input: {
                          $concat: [
                            { $ifNull: ['$$user.firstName', ''] },
                            ' ',
                            { $ifNull: ['$$user.lastName', ''] },
                          ],
                        },
                      },
                    },
                    profilePicture: '$$profile.profilePicture',
                  },
                },
              },
              else: '$$REMOVE',
            },
          },
        },
      },
      {
        $project: {
          agentUser: 0,
          agentProfile: 0,
        },
      },
    ]);

    // Convert back to Mongoose documents
    return messages.map((msg) => new this.chatMessageModel(msg));
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

  /**
   * Get all messages for a chat session (for transcript purposes)
   * @param chatSessionId - The chat session ID
   * @returns All messages for the session ordered by timestamp
   */
  async getAllMessagesForSession(
    chatSessionId: string,
  ): Promise<ChatMessageDocument[]> {
    if (!Types.ObjectId.isValid(chatSessionId)) {
      throw new BadRequestException('Invalid chat session ID format');
    }

    return this.chatMessageModel
      .find({ chatSessionId: new Types.ObjectId(chatSessionId) })
      .sort({ timestamp: 1 }) // Chronological order for transcript
      .exec();
  }

  /**
   * Get the last message for a chat session
   * @param chatSessionId - The chat session ID
   * @returns The last message for the session or null if no messages exist
   */
  async getLastMessageForSession(
    chatSessionId: string,
  ): Promise<ChatMessageDocument | null> {
    if (!Types.ObjectId.isValid(chatSessionId)) {
      throw new BadRequestException('Invalid chat session ID format');
    }

    return this.chatMessageModel
      .findOne({ chatSessionId: new Types.ObjectId(chatSessionId) })
      .sort({ timestamp: -1 }) // Get the most recent message
      .exec();
  }

  /**
   * Get the last non-system message for a chat session
   * @param chatSessionId - The chat session ID
   * @returns The last non-system message for the session or null if no non-system messages exist
   */
  async getLastNonSystemMessageForSession(
    chatSessionId: string,
  ): Promise<ChatMessageDocument | null> {
    if (!Types.ObjectId.isValid(chatSessionId)) {
      throw new BadRequestException('Invalid chat session ID format');
    }

    return this.chatMessageModel
      .findOne({
        chatSessionId: new Types.ObjectId(chatSessionId),
        senderType: { $ne: ChatMessageSenderType.SYSTEM },
      })
      .sort({ timestamp: -1 }) // Get the most recent non-system message
      .exec();
  }
}
