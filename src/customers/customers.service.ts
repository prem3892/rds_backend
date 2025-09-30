import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from 'src/schemas/customer.schema';
import { Widget, WidgetDocument } from 'src/schemas/widget.schema';
import {
  AgentProfile,
  AgentProfileDocument,
} from 'src/schemas/agent-profile.schema';
import { UserRole } from 'src/shared/constants/enums';
import { GetBlockedCustomersDto } from './dto/get-blocked-customers.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from 'src/shared/dto/common-responses.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Widget.name) private widgetModel: Model<WidgetDocument>,
    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,
  ) {}

  async findById(
    id: string | Types.ObjectId,
  ): Promise<CustomerDocument | null> {
    return this.customerModel.findById(id).exec();
  }

  async findByIdOrFail(id: string | Types.ObjectId): Promise<CustomerDocument> {
    const customer = await this.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found.`);
    }
    return customer;
  }

  async findByFingerprintAndWidget(
    fingerprint: string,
    widgetId: Types.ObjectId,
  ): Promise<CustomerDocument | null> {
    return this.customerModel.findOne({ fingerprint, widgetId }).exec();
  }

  async createOrUpdateCustomer(data: {
    widgetId: Types.ObjectId;
    fingerprint: string;
    customerId?: string;
    name?: string;
    email?: string;
    metadata?: Record<string, any>;
  }): Promise<CustomerDocument> {
    if (data.customerId) {
      const existingCustomer = await this.findById(data.customerId);
      if (existingCustomer) {
        // Update if fingerprint matches or if it's an identified customer
        if (
          existingCustomer.fingerprint === data.fingerprint ||
          data.name ||
          data.email
        ) {
          if (data.name) existingCustomer.name = data.name;
          if (data.email) existingCustomer.email = data.email;
          if (data.metadata)
            existingCustomer.metadata = {
              ...existingCustomer.metadata,
              ...data.metadata,
            };
          return existingCustomer.save();
        }
      }
    }

    // Try to find by fingerprint and widgetId for anonymous users
    let customer = await this.findByFingerprintAndWidget(
      data.fingerprint,
      data.widgetId,
    );
    if (customer) {
      // Update metadata, or name/email if provided later
      if (data.name && !customer.name) customer.name = data.name;
      if (data.email && !customer.email) customer.email = data.email;
      if (data.metadata)
        customer.metadata = { ...customer.metadata, ...data.metadata };
      return customer.save();
    }

    // Create new customer
    const newCustomer = new this.customerModel({
      widgetId: data.widgetId,
      fingerprint: data.fingerprint,
      name: data.name,
      email: data.email,
      metadata: data.metadata,
    });
    return newCustomer.save();
  }

  async updateCustomerDetails(
    customerId: string,
    details: { name?: string; email?: string },
  ): Promise<CustomerDocument> {
    const customer = await this.findByIdOrFail(customerId);
    if (details.name) customer.name = details.name;
    if (details.email) customer.email = details.email;
    return customer.save();
  }

  async findCustomersByNameOrEmail(
    name?: string,
    email?: string,
  ): Promise<Types.ObjectId[]> {
    const query: any = {};
    if (name) query.name = new RegExp(name, 'i');
    if (email) query.email = new RegExp(email, 'i');

    const customers = await this.customerModel.find(query).select('_id').exec();

    return customers.map((c) => c._id);
  }

  /**
   * Get admin ID for a user based on their role
   * - If user is ADMIN, returns their own ID
   * - If user is AGENT, returns their adminId from AgentProfile
   */
  private async getAdminIdForUser(
    userId: Types.ObjectId,
    userRole: UserRole,
  ): Promise<Types.ObjectId> {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MANAGER) {
      return userId;
    } else if (userRole === UserRole.AGENT) {
      const agentProfile = await this.agentProfileModel
        .findOne({ userId })
        .exec();
      if (!agentProfile) {
        throw new NotFoundException('Agent profile not found');
      }
      return agentProfile.adminId;
    } else {
      throw new ForbiddenException(
        'Only admins and agents can access this resource',
      );
    }
  }

  /**
   * Get widget IDs that a user has access to
   */
  private async getAccessibleWidgetIds(
    userId: Types.ObjectId,
    userRole: UserRole,
  ): Promise<Types.ObjectId[]> {
    const adminId = await this.getAdminIdForUser(userId, userRole);

    const widgets = await this.widgetModel
      .find({ createdBy: adminId })
      .select('_id')
      .exec();

    return widgets.map((w) => w._id);
  }

  /**
   * Check if user has access to a specific customer
   */
  private async hasAccessToCustomer(
    userId: Types.ObjectId,
    userRole: UserRole,
    customerId: string | Types.ObjectId,
  ): Promise<boolean> {
    const customer = await this.customerModel.findById(customerId).exec();
    if (!customer) {
      return false;
    }

    const accessibleWidgetIds = await this.getAccessibleWidgetIds(
      userId,
      userRole,
    );
    return accessibleWidgetIds.some((widgetId) =>
      widgetId.equals(customer.widgetId),
    );
  }

  /**
   * Get blocked customers that the user has access to (Admin and Agent) with pagination
   */
  async getBlockedCustomers(
    userId: Types.ObjectId,
    userRole: UserRole,
    queryDto: GetBlockedCustomersDto,
  ): Promise<PaginatedResponseDto<CustomerDocument>> {
    if (
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.MANAGER &&
      userRole !== UserRole.AGENT
    ) {
      throw new ForbiddenException(
        'Only admins, managers and agents can view the blocked customers list',
      );
    }

    const accessibleWidgetIds = await this.getAccessibleWidgetIds(
      userId,
      userRole,
    );

    const {
      search,
      page = 1,
      limit = 10,
      sortBy = 'blockedAt',
      sortOrder = 'desc',
    } = queryDto;

    // Build query
    const query: any = {
      isBlocked: true,
      widgetId: { $in: accessibleWidgetIds },
    };

    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fingerprint: { $regex: search, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries in parallel
    const [items, total] = await Promise.all([
      this.customerModel
        .find(query)
        .populate('blockedBy', 'firstName lastName email')
        .populate('widgetId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.customerModel.countDocuments(query).exec(),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const meta: PaginationMetaDto = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      items,
      meta,
    };
  }

  async blockCustomer(
    customerId: string | Types.ObjectId,
    blockedBy: Types.ObjectId,
    userRole: UserRole,
  ): Promise<CustomerDocument> {
    // Check access control
    const hasAccess = await this.hasAccessToCustomer(
      blockedBy,
      userRole,
      customerId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to block this customer',
      );
    }

    const customer = await this.findByIdOrFail(customerId);

    if (customer.isBlocked) {
      throw new Error('Customer is already blocked');
    }

    customer.isBlocked = true;
    customer.blockedBy = blockedBy;
    customer.blockedAt = new Date();

    return customer.save();
  }

  async unblockCustomer(
    customerId: string | Types.ObjectId,
    userId: Types.ObjectId,
    userRole: UserRole,
  ): Promise<CustomerDocument> {
    // Check access control
    const hasAccess = await this.hasAccessToCustomer(
      userId,
      userRole,
      customerId,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to unblock this customer',
      );
    }

    const customer = await this.findByIdOrFail(customerId);

    if (!customer.isBlocked) {
      throw new Error('Customer is not blocked');
    }

    customer.isBlocked = false;
    customer.blockedBy = undefined;
    customer.blockedAt = undefined;

    return customer.save();
  }

  async isCustomerBlocked(
    customerId: string | Types.ObjectId,
  ): Promise<boolean> {
    const customer = await this.findById(customerId);
    return customer ? customer.isBlocked : false;
  }
}
