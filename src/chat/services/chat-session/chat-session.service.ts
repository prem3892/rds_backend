import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatSession,
  ChatSessionDocument,
} from 'src/schemas/chat-session.schema';
import { ChatSessionStatus, UserRole } from 'src/shared/constants/enums';
import { AgentsService } from 'src/agents/agents.service';
import { CustomersService } from 'src/customers/customers.service';
import { InitiateChatDto } from 'src/chat/dto/initiate-chat.dto';
import { WidgetsService } from 'src/widgets/widgets.service';
import { DepartmentsService } from 'src/departments/departments.service';
import { CustomerDocument } from 'src/schemas/customer.schema';
import { GetChatSessionsQueryDto } from 'src/chat/dto/get-chat-session.dto';

@Injectable()
export class ChatSessionService {
  private readonly logger = new Logger(ChatSessionService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    @Inject(forwardRef(() => AgentsService))
    private readonly agentsService: AgentsService,
    private readonly customersService: CustomersService,
    private readonly widgetsService: WidgetsService,
    private readonly departmentsService: DepartmentsService,
  ) {}

  async findById(
    id: string | Types.ObjectId,
  ): Promise<ChatSessionDocument | null> {
    return this.chatSessionModel
      .findById(id)
      .populate('widgetId')
      .populate('customerId')
      .populate({ path: 'agentId', select: 'firstName lastName email role' }) // Populate agent User details
      .populate('departmentId')
      .exec();
  }

  async findByIdOrFail(
    id: string | Types.ObjectId,
  ): Promise<ChatSessionDocument> {
    const session = await this.findById(id);
    if (!session) {
      throw new NotFoundException(`Chat session with ID ${id} not found.`);
    }
    return session;
  }

  async initiateChat(
    dto: InitiateChatDto,
    domain: string,
    customer: CustomerDocument,
  ): Promise<{ session: ChatSessionDocument; wasNew: boolean }> {
    // Check for existing PENDING_ASSIGNMENT or ACTIVE session for this customer and widget
    const existingSession = await this.chatSessionModel
      .findOne({
        customerId: customer._id,
        widgetId: new Types.ObjectId(dto.widgetId),
        status: {
          $in: [
            ChatSessionStatus.PENDING_ASSIGNMENT,
            ChatSessionStatus.ACTIVE,
            ChatSessionStatus.PENDING_AGENT_RECONNECT,
          ],
        },
      })
      .exec();

    if (existingSession) {
      this.logger.log(
        `Customer ${customer._id} already has an active/pending session ${existingSession._id}`,
      );
      return {
        session: await this.findByIdOrFail(existingSession._id),
        wasNew: false,
      }; // Return full populated session
    }

    const widget = await this.widgetsService.findById(dto.widgetId);
    if (!widget || !widget.isEnabled) {
      throw new BadRequestException('Widget not found or is disabled.');
    }
    if (!widget.domains.includes(domain) && !widget.domains.includes('*')) {
      // This check might be more relevant at widget load time, but good to have here too
      // this.logger.warn(`Chat initiation from invalid domain ${domain} for widget ${widget._id}`);
      // For now, allow if widget config allows any domain or matches
    }

    const department = await this.departmentsService.findById(dto.departmentId);
    if (!department) {
      throw new BadRequestException('Department not found.');
    }
    if (
      !widget.departmentIds
        .map((id) => id.toString())
        .includes(department._id.toString())
    ) {
      throw new BadRequestException('Department not valid for this widget.');
    }

    // Update customer name/email if provided
    if (dto.name || dto.email) {
      await this.customersService.updateCustomerDetails(
        customer._id.toString(),
        { name: dto.name, email: dto.email },
      );
    }

    const newSession = new this.chatSessionModel({
      widgetId: widget._id,
      customerId: customer._id,
      departmentId: department._id,
      initialMessage: dto.initialMessage,
      domain: domain,
      status: ChatSessionStatus.PENDING_ASSIGNMENT,
      initiatedAt: new Date(),
      lastMessageAt: new Date(), // For the initial message
      customerLastSeen: new Date(),
    });
    const savedSession = await newSession.save();
    this.logger.log(
      `New chat session ${savedSession._id} initiated by customer ${customer._id}`,
    );
    return {
      session: await this.findByIdOrFail(savedSession._id),
      wasNew: true,
    }; // Return full populated session
  }

  async acceptChat(
    chatSessionId: string,
    agentId: string,
  ): Promise<ChatSessionDocument | null> {
    const agentObjectId = new Types.ObjectId(agentId);
    const sessionObjectId = new Types.ObjectId(chatSessionId);

    // Atomic update to prevent race conditions
    const updatedSession = await this.chatSessionModel
      .findOneAndUpdate(
        {
          _id: sessionObjectId,
          status: ChatSessionStatus.PENDING_ASSIGNMENT, // Only accept if pending
          agentId: null, // Ensure no other agent has accepted it
        },
        {
          $set: {
            agentId: agentObjectId,
            status: ChatSessionStatus.ACTIVE,
            acceptedAt: new Date(),
            agentLastSeen: new Date(),
          },
        },
        { new: true }, // Return the updated document
      )
      .populate('widgetId')
      .populate('customerId')
      .populate({ path: 'agentId', select: 'firstName lastName email role' })
      .populate('departmentId')
      .exec();

    if (updatedSession) {
      this.logger.log(
        `Chat session ${chatSessionId} accepted by agent ${agentId}`,
      );
    } else {
      this.logger.warn(
        `Failed to accept chat session ${chatSessionId} by agent ${agentId} (already accepted or not pending)`,
      );
    }
    return updatedSession; // Will be null if the findOneAndUpdate conditions were not met
  }

  async updateSessionStatus(
    sessionId: string | Types.ObjectId,
    status: ChatSessionStatus,
    endedAt?: Date,
  ): Promise<ChatSessionDocument> {
    const update: any = { status };
    if (
      endedAt ||
      [
        ChatSessionStatus.RESOLVED,
        ChatSessionStatus.CLOSED_BY_AGENT,
        ChatSessionStatus.CLOSED_BY_CUSTOMER,
        ChatSessionStatus.ABANDONED_BY_AGENT,
        ChatSessionStatus.ABANDONED_BY_CUSTOMER,
        ChatSessionStatus.EXPIRED_PENDING_ASSIGNMENT,
      ].includes(status)
    ) {
      update.endedAt = endedAt || new Date();
    }

    const updatedSession = await this.chatSessionModel
      .findByIdAndUpdate(sessionId, { $set: update }, { new: true })
      .populate('widgetId')
      .populate('customerId')
      .populate({ path: 'agentId', select: 'firstName lastName email role' })
      .populate('departmentId')
      .exec();

    if (!updatedSession) {
      throw new NotFoundException(
        `Chat session with ID ${sessionId} not found for status update.`,
      );
    }
    this.logger.log(`Chat session ${sessionId} status updated to ${status}`);
    return updatedSession;
  }

  async countActiveChatsForAgent(agentId: Types.ObjectId): Promise<number> {
    return this.chatSessionModel
      .countDocuments({
        agentId: agentId,
        status: ChatSessionStatus.ACTIVE,
      })
      .exec();
  }

  async getActiveSessionsForAgent(
    agentId: string,
  ): Promise<ChatSessionDocument[]> {
    return this.chatSessionModel
      .find({
        agentId: new Types.ObjectId(agentId),
        status: ChatSessionStatus.ACTIVE,
      })
      .populate('widgetId', 'name')
      .populate('customerId', 'name email metadata')
      .populate('departmentId', 'name')
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  async getPendingAssignmentSessions(
    firstAlertThresholdMs: number,
    subsequentAlertIntervalMs: number,
    maxPriorityAlerts: number,
  ): Promise<ChatSessionDocument[]> {
    const now = new Date();
    return this.chatSessionModel
      .find({
        status: ChatSessionStatus.PENDING_ASSIGNMENT,
        $or: [
          // Condition 1: First Alert
          {
            priorityNotificationSentCount: 0,
            initiatedAt: {
              $lte: new Date(now.getTime() - firstAlertThresholdMs),
            },
          },
          // Condition 2: Subsequent Alerts
          {
            priorityNotificationSentCount: { $gt: 0, $lt: maxPriorityAlerts },
            lastPriorityNotificationSentAt: {
              $lte: new Date(now.getTime() - subsequentAlertIntervalMs),
            },
          },
        ],
      })
      .populate('departmentId') // Needed for finding eligible agents
      .populate('customerId') // Needed for notification payload
      .exec();
  }

  async getExpiredPendingSessions(
    subsequentAlertIntervalMs: number,
    maxPriorityAlerts: number,
  ): Promise<ChatSessionDocument[]> {
    const now = new Date();
    return this.chatSessionModel
      .find({
        status: ChatSessionStatus.PENDING_ASSIGNMENT,
        priorityNotificationSentCount: { $gte: maxPriorityAlerts },
        lastPriorityNotificationSentAt: {
          $lte: new Date(now.getTime() - subsequentAlertIntervalMs),
        }, // Or a separate expiry timeout
      })
      .exec();
  }

  async incrementPriorityNotificationCount(
    sessionId: Types.ObjectId,
  ): Promise<ChatSessionDocument | null> {
    return this.chatSessionModel
      .findByIdAndUpdate(
        sessionId,
        {
          $inc: { priorityNotificationSentCount: 1 },
          $set: { lastPriorityNotificationSentAt: new Date() },
        },
        { new: true },
      )
      .exec();
  }

  async updateLastMessageTimestamp(
    sessionId: string | Types.ObjectId,
    timestamp: Date = new Date(),
  ): Promise<void> {
    await this.chatSessionModel
      .findByIdAndUpdate(sessionId, { $set: { lastMessageAt: timestamp } })
      .exec();
  }

  async updateCustomerLastSeen(
    sessionId: string | Types.ObjectId,
    timestamp: Date = new Date(),
  ): Promise<void> {
    await this.chatSessionModel
      .findByIdAndUpdate(sessionId, { $set: { customerLastSeen: timestamp } })
      .exec();
  }

  async updateAgentLastSeen(
    sessionId: string | Types.ObjectId,
    timestamp: Date = new Date(),
  ): Promise<void> {
    await this.chatSessionModel
      .findByIdAndUpdate(sessionId, { $set: { agentLastSeen: timestamp } })
      .exec();
  }

  async findAllPaginated(
    queryDto: GetChatSessionsQueryDto,
  ): Promise<{ data: ChatSessionDocument[]; total: number }> {
    const {
      limit = 10,
      page = 1,
      status,
      agentId,
      departmentId,
      customerName,
      customerEmail,
    } = queryDto;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) query.status = status;
    if (agentId) {
      if (!Types.ObjectId.isValid(agentId))
        throw new BadRequestException('Invalid agent ID format');
      query.agentId = new Types.ObjectId(agentId);
    }
    if (departmentId) {
      if (!Types.ObjectId.isValid(departmentId))
        throw new BadRequestException('Invalid department ID format');
      query.departmentId = new Types.ObjectId(departmentId);
    }

    let customerIds: Types.ObjectId[] | undefined = undefined;
    if (customerName || customerEmail) {
      customerIds = await this.customersService.findCustomersByNameOrEmail(
        customerName,
        customerEmail,
      );
      if (customerIds.length === 0 && (customerName || customerEmail)) {
        // No customers match, so no sessions will match
        return { data: [], total: 0 };
      }
      if (customerIds.length > 0) {
        query.customerId = { $in: customerIds };
      }
    }

    const data = await this.chatSessionModel
      .find(query)
      .populate('widgetId', 'name')
      .populate('customerId', 'name email')
      .populate({ path: 'agentId', select: 'firstName lastName email' })
      .populate('departmentId', 'name')
      .sort({ initiatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.chatSessionModel.countDocuments(query).exec();
    return { data, total };
  }

  async getSessionsForAgentReconnect(
    agentId: Types.ObjectId,
  ): Promise<ChatSessionDocument[]> {
    return this.chatSessionModel
      .find({
        agentId: agentId,
        status: ChatSessionStatus.PENDING_AGENT_RECONNECT,
      })
      .populate('customerId')
      .exec();
  }

  async getSessionsForCustomerReconnect(
    customerId: Types.ObjectId,
  ): Promise<ChatSessionDocument[]> {
    return this.chatSessionModel
      .find({
        customerId: customerId,
        status: {
          $in: [
            ChatSessionStatus.ACTIVE,
            ChatSessionStatus.PENDING_AGENT_RECONNECT,
          ],
        }, // Customer can reconnect to active or agent-pending chats
      })
      .populate({ path: 'agentId', select: 'firstName lastName' })
      .exec();
  }
}
