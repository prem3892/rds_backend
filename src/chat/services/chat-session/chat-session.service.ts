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

  /**
   * Find a chat session by ID
   * @param id - The ID of the chat session to find
   * @param options - Query options
   * @param options.populateCustomer - Set to true to populate the customer details (default: false)
   * @returns The chat session document or null if not found
   * @example
   * // Without customer population
   * const session = await chatSessionService.findById(id);
   * // With customer population
   * const sessionWithCustomer = await chatSessionService.findById(id, { populateCustomer: true });
   */
  async findById(
    id: string | Types.ObjectId,
    options: {
      populateCustomer?: boolean;
      populateWidget?: boolean;
      populateDepartment?: boolean;
    } = {},
  ): Promise<ChatSessionDocument | null> {
    const {
      populateCustomer = false,
      populateWidget = true,
      populateDepartment = true,
    } = options;

    let _id: Types.ObjectId;

    // convert the string to ObjectId if necessary
    if (typeof id === 'string')
      _id = new Types.ObjectId(id); // Convert string to ObjectId
    else _id = id;

    const query = this.chatSessionModel.findById(id);
    // .populate('widgetId')
    //.populate('departmentId');

    // Optionally populate widget
    if (populateWidget) {
      query.populate('widgetId');
    }

    // Optionally populate customerId based on the parameter
    if (populateCustomer) {
      query.populate('customerId');
    }

    if (populateDepartment) {
      query.populate('departmentId');
    }

    return query.exec();
  }

  /**
   * Find a chat session by ID or throw an exception if not found
   * @param id - The ID of the chat session to find
   * @param options - Query options
   * @param options.populateCustomer - Set to true to populate the customer details (default: false)
   * @returns The chat session document
   * @throws NotFoundException if the chat session is not found
   * @example
   * // Without customer population
   * const session = await chatSessionService.findByIdOrFail(id);
   * // With customer population
   * const sessionWithCustomer = await chatSessionService.findByIdOrFail(id, { populateCustomer: true });
   */
  async findByIdOrFail(
    id: string | Types.ObjectId,
    options: { populateCustomer?: boolean } = {},
  ): Promise<ChatSessionDocument> {
    const session = await this.findById(id, options);
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
        session: await this.findByIdOrFail(existingSession._id, {
          populateCustomer: true,
        }),
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

    // Handle departmentId if provided, otherwise use the first department from the widget
    let department;

    if (dto.departmentId) {
      department = await this.departmentsService.findById(dto.departmentId);
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
    } else {
      // Use the first department from the widget if available
      if (!widget.departmentIds || widget.departmentIds.length === 0) {
        throw new BadRequestException('Widget has no departments configured.');
      }

      department = await this.departmentsService.findById(
        widget.departmentIds[0],
      );
      if (!department) {
        throw new BadRequestException('Default department not found.');
      }
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
      session: await this.findByIdOrFail(savedSession._id, {
        populateCustomer: true,
      }),
      wasNew: true,
    }; // Return full populated session
  }

  /**
   * Check if customer has any active chat sessions
   */
  async findActiveSessionForCustomer(
    customerId: string,
  ): Promise<ChatSessionDocument | null> {
    return this.chatSessionModel
      .findOne({
        customerId: new Types.ObjectId(customerId),
        status: {
          $in: [
            ChatSessionStatus.PENDING_ASSIGNMENT,
            ChatSessionStatus.ACTIVE,
            ChatSessionStatus.PENDING_AGENT_RECONNECT,
          ],
        },
      })
      .exec();
  }

  /**
   * Create a new chat session initiated by an agent
   */
  async initiateAgentChat(
    customerId: string,
    agentId: string,
    widget: any,
    customer: any,
  ): Promise<ChatSessionDocument> {
    const customerObjectId = new Types.ObjectId(customerId);
    const agentObjectId = new Types.ObjectId(agentId);
    const now = new Date();

    // Get customer's domain from metadata
    const domain = customer.metadata?.initialDomain || 'unknown';

    // Use the first department from the widget as default
    const departmentId =
      widget.departmentIds && widget.departmentIds.length > 0
        ? widget.departmentIds[0]
        : null;

    const newSession = new this.chatSessionModel({
      customerId: customerObjectId,
      widgetId: widget._id,
      departmentId,
      agentId: agentObjectId,
      status: ChatSessionStatus.ACTIVE, // Agent-initiated sessions start as ACTIVE
      domain,
      initiatedAt: now,
      acceptedAt: now, // Agent immediately accepts their own initiated chat
      agentLastSeen: now,
      agentHistory: [
        {
          agentId: agentObjectId,
          assignedAt: now,
        },
      ],
    });

    const savedSession = await newSession.save();

    return this.findByIdOrFail(savedSession._id, {
      populateCustomer: true,
    });
  }

  /**
   *
   * @param chatSessionId
   * @param agentId
   * @returns ChatSessionDocument with customer details populated
   */

  async acceptChat(
    chatSessionId: string,
    agentId: string,
  ): Promise<ChatSessionDocument | null> {
    const agentObjectId = new Types.ObjectId(agentId);
    const sessionObjectId = new Types.ObjectId(chatSessionId);
    const now = new Date();

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
            acceptedAt: now,
            agentLastSeen: now,
          },
          $push: {
            agentHistory: {
              agentId: agentObjectId,
              joinedAt: now,
              isActive: true,
            },
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
    this.logger.log(`Getting active sessions for agent ${agentId}`);

    return this.chatSessionModel
      .find({
        agentId: new Types.ObjectId(agentId),
        status: {
          $in: [
            ChatSessionStatus.ACTIVE,
            ChatSessionStatus.PENDING_AGENT_RECONNECT,
          ],
        },
      })
      .populate('widgetId', 'name')
      .populate('customerId', 'name email metadata')
      .populate('departmentId', 'name')
      .sort({ lastMessageAt: -1 })
      .exec();
  }

  async getPendingSessionsForAgent(
    agentId: string,
  ): Promise<ChatSessionDocument[]> {
    this.logger.log(`Getting pending sessions for agent ${agentId}`);

    // Get agent's accessible widgets based on department assignments
    const accessibleWidgets =
      await this.agentsService.getAgentAccessibleWidgets(agentId);

    if (!accessibleWidgets || accessibleWidgets.length === 0) {
      this.logger.debug(`No accessible widgets found for agent ${agentId}`);
      return [];
    }

    const widgetIds = accessibleWidgets.map(
      (widget) => new Types.ObjectId(widget._id),
    );

    this.logger.debug(
      `Agent ${agentId} has access to ${widgetIds.length} widgets: ${widgetIds.map((id) => id.toString()).join(', ')}`,
    );

    return this.chatSessionModel
      .find({
        widgetId: { $in: widgetIds },
        status: ChatSessionStatus.PENDING_ASSIGNMENT,
      })
      .populate('widgetId', 'name')
      .populate('customerId', 'name email metadata')
      .populate('departmentId', 'name')
      .sort({ initiatedAt: 1 }) // Oldest first - they need attention first
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

  /**
   * Marks an agent as inactive in a chat session and updates the session status
   * @param sessionId The chat session ID
   * @param agentId The agent ID to mark as inactive
   * @returns The updated chat session
   */
  async markAgentInactive(
    sessionId: string | Types.ObjectId,
    agentId: string | Types.ObjectId,
  ): Promise<ChatSessionDocument> {
    const now = new Date();
    const agentObjectId =
      typeof agentId === 'string' ? new Types.ObjectId(agentId) : agentId;
    const sessionObjectId =
      typeof sessionId === 'string' ? new Types.ObjectId(sessionId) : sessionId;

    // Update the agent history to mark the agent as inactive
    const updatedSession = await this.chatSessionModel
      .findOneAndUpdate(
        {
          _id: sessionObjectId,
          status: ChatSessionStatus.ACTIVE,
          agentId: agentObjectId,
          'agentHistory.agentId': agentObjectId,
          'agentHistory.isActive': true,
        },
        {
          $set: {
            status: ChatSessionStatus.PENDING_ASSIGNMENT,
            agentId: null,
            'agentHistory.$[elem].isActive': false,
            'agentHistory.$[elem].leftAt': now,
          },
        },
        {
          arrayFilters: [
            { 'elem.agentId': agentObjectId, 'elem.isActive': true },
          ],
          new: true,
        },
      )
      .populate('widgetId')
      .populate('customerId')
      .populate('departmentId')
      .exec();

    if (!updatedSession) {
      throw new NotFoundException(
        `Chat session with ID ${sessionId} not found or agent ${agentId} is not active in this session.`,
      );
    }

    this.logger.log(
      `Agent ${agentId} marked as inactive in chat session ${sessionId}. Session status updated to PENDING_ASSIGNMENT.`,
    );
    return updatedSession;
  }

  /**
   * Find active chat sessions where the agent has been inactive for a specified duration
   * @param inactivityThresholdMs The threshold in milliseconds for agent inactivity
   * @returns Array of chat sessions with inactive agents
   */
  async findSessionsWithInactiveAgents(
    inactivityThresholdMs: number,
  ): Promise<ChatSessionDocument[]> {
    const inactivityThreshold = new Date(Date.now() - inactivityThresholdMs);

    return (
      this.chatSessionModel
        .find({
          status: ChatSessionStatus.ACTIVE,
          agentId: { $ne: null },
          agentLastSeen: { $lt: inactivityThreshold },
        })
        // .populate('agentId')
        .populate('customerId')
        .exec()
    );
  }

  /**
   * Find active chat sessions where the customer has been inactive for a specified duration
   * @param inactivityThresholdMs The threshold in milliseconds for customer inactivity
   * @returns Array of chat sessions with inactive customers
   */
  async findSessionsWithInactiveCustomers(
    inactivityThresholdMs: number,
  ): Promise<ChatSessionDocument[]> {
    const inactivityThreshold = new Date(Date.now() - inactivityThresholdMs);

    return this.chatSessionModel
      .find({
        status: ChatSessionStatus.ACTIVE,
        customerId: { $ne: null },
        customerLastSeen: { $lt: inactivityThreshold },
      })
      .populate('customerId')
      .exec();
  }

  /**
   * Find all active chat sessions
   * @returns Array of all active chat sessions
   */
  async findAllActiveSessions(): Promise<ChatSessionDocument[]> {
    return this.chatSessionModel
      .find({
        status: ChatSessionStatus.ACTIVE,
      })
      .populate('customerId')
      .exec();
  }

  /**
   * Marks a customer as inactive in a chat session and updates the session status
   * @param sessionId The chat session ID
   * @returns The updated chat session
   */
  async markCustomerInactive(
    sessionId: string | Types.ObjectId,
  ): Promise<ChatSessionDocument> {
    const now = new Date();
    const sessionObjectId =
      typeof sessionId === 'string' ? new Types.ObjectId(sessionId) : sessionId;

    // Update the session to mark customer as inactive
    const updatedSession = await this.chatSessionModel
      .findOneAndUpdate(
        {
          _id: sessionObjectId,
          status: ChatSessionStatus.ACTIVE,
        },
        {
          $set: {
            status: ChatSessionStatus.ABANDONED_BY_CUSTOMER,
            endedAt: now,
          },
        },
        {
          new: true,
        },
      )
      .populate('widgetId')
      .populate('customerId')
      .populate('departmentId')
      .exec();

    if (!updatedSession) {
      throw new NotFoundException(
        `Chat session with ID ${sessionId} not found or is not active.`,
      );
    }

    this.logger.log(
      `Customer marked as inactive in chat session ${sessionId}. Session status updated to ABANDONED_BY_CUSTOMER.`,
    );
    return updatedSession;
  }

  async findAllPaginated(queryDto: GetChatSessionsQueryDto): Promise<{
    items: ChatSessionDocument[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
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
        const meta = {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        };
        return { items: [], meta };
      }
      if (customerIds.length > 0) {
        query.customerId = { $in: customerIds };
      }
    }

    const [items, total] = await Promise.all([
      this.chatSessionModel
        .find(query)
        .populate('widgetId', 'name')
        .populate('customerId')
        .populate({ path: 'agentId', select: 'firstName lastName email' })
        .populate('departmentId', 'name')
        .sort({ initiatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.chatSessionModel.countDocuments(query).exec(),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return { items, meta };
  }

  /**
   * Find all paginated chat sessions for an admin (only sessions assigned to their managed agents)
   * @param queryDto - Query parameters for filtering and pagination
   * @param adminId - The ID of the admin
   * @returns Paginated list of chat sessions for the admin's managed agents
   */
  async findAllPaginatedForAdmin(
    queryDto: GetChatSessionsQueryDto,
    adminId: string,
  ): Promise<{
    items: ChatSessionDocument[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Get all agents managed by this admin
    const agentProfiles =
      await this.agentsService.getAllAgentProfilesWithUserDetails(adminId);
    const managedAgentIds = agentProfiles.map((profile) => profile.userId);

    // Also include the admin themselves if they have an agent profile (admins can also act as agents)
    const adminAgentProfile =
      await this.agentsService.findAgentProfileByUserId(adminId);
    if (adminAgentProfile) {
      managedAgentIds.push(new Types.ObjectId(adminId));
    }

    if (managedAgentIds.length === 0) {
      // Admin has no managed agents and is not an agent themselves
      const { limit = 10, page = 1 } = queryDto;
      const meta = {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      };
      return { items: [], meta };
    }

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

    const query: any = {
      agentId: { $in: managedAgentIds }, // Only sessions assigned to managed agents
    };

    // Apply additional filters
    if (status) query.status = status;
    if (agentId) {
      if (!Types.ObjectId.isValid(agentId))
        throw new BadRequestException('Invalid agent ID format');
      const requestedAgentId = new Types.ObjectId(agentId);
      // Ensure the requested agent is managed by this admin
      if (!managedAgentIds.some((id) => id.equals(requestedAgentId))) {
        throw new BadRequestException(
          'You do not have permission to view sessions for this agent',
        );
      }
      query.agentId = requestedAgentId;
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
        const meta = {
          page,
          limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        };
        return { items: [], meta };
      }
      if (customerIds.length > 0) {
        query.customerId = { $in: customerIds };
      }
    }

    const [items, total] = await Promise.all([
      this.chatSessionModel
        .find(query)
        .populate('widgetId', 'name')
        .populate('customerId')
        .populate({ path: 'agentId', select: 'firstName lastName email' })
        .populate('departmentId', 'name')
        .sort({ initiatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.chatSessionModel.countDocuments(query).exec(),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const meta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return { items, meta };
  }

  /**
   * Check if a chat session is accessible by an admin (i.e., assigned to one of their managed agents)
   * @param sessionId - The ID of the chat session
   * @param adminId - The ID of the admin
   * @returns True if the admin can access this session, false otherwise
   */
  async isSessionAccessibleByAdmin(
    sessionId: string,
    adminId: string,
  ): Promise<boolean> {
    const session = await this.findById(sessionId);
    if (!session || !session.agentId) {
      return false;
    }

    // Get all agents managed by this admin
    const agentProfiles =
      await this.agentsService.getAllAgentProfilesWithUserDetails(adminId);
    const managedAgentIds = agentProfiles.map((profile) =>
      profile.userId.toString(),
    );

    // Also include the admin themselves if they have an agent profile (admins can also act as agents)
    const adminAgentProfile =
      await this.agentsService.findAgentProfileByUserId(adminId);
    if (adminAgentProfile) {
      managedAgentIds.push(adminId);
    }

    // Check if the session's agent is in the list of managed agents
    return managedAgentIds.includes(session.agentId._id.toString());
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

  /**
   * Get paginated chat sessions for a specific agent
   * @param agentId - The ID of the agent
   * @param queryDto - Query parameters for filtering and pagination
   * @returns Paginated list of chat sessions for the agent
   */
  async findSessionsForAgent(
    agentId: string,
    queryDto: GetChatSessionsQueryDto,
  ): Promise<{
    items: ChatSessionDocument[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    // Create a copy of the query DTO and force the agentId
    const agentQueryDto = { ...queryDto, agentId };
    return this.findAllPaginated(agentQueryDto);
  }
}
