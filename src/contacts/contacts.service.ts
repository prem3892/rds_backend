import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact, ContactDocument } from '../schemas/contact.schema';
import { Customer, CustomerDocument } from '../schemas/customer.schema';
import {
  AgentProfile,
  AgentProfileDocument,
} from '../schemas/agent-profile.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { GetContactsDto } from './dto/get-contacts.dto';
import { UserRole } from '../shared/constants/enums';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(AgentProfile.name)
    private agentProfileModel: Model<AgentProfileDocument>,
  ) {}

  async create(
    createContactDto: CreateContactDto,
    userId: Types.ObjectId,
  ): Promise<ContactDocument> {
    // Verify customer exists
    const customer = await this.customerModel.findById(
      createContactDto.customer,
    );
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${createContactDto.customer} not found`,
      );
    }

    // Check if contact with same email already exists for this customer
    const existingContact = await this.contactModel.findOne({
      email: createContactDto.email,
      customer: createContactDto.customer,
    });

    if (existingContact) {
      throw new BadRequestException(
        `Contact with email ${createContactDto.email} already exists for this customer`,
      );
    }

    this.logger.debug(`Creating contact with user_id: ${userId}`);

    const contact = new this.contactModel({
      ...createContactDto,
      customer: new Types.ObjectId(createContactDto.customer),
      createdBy: userId,
    });

    return contact.save();
  }

  async findAll(
    queryDto: GetContactsDto,
    user: { _id: Types.ObjectId; role: UserRole },
  ): Promise<{
    items: ContactDocument[];
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
      search,
      customer,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    // Build query
    const query: any = {};

    // Role-based filtering
    if (user.role === UserRole.AGENT) {
      // Agents can only see contacts they created
      query.createdBy = user._id;
    } else if (user.role === UserRole.ADMIN) {
      // Admins can see contacts created by themselves and their agents
      const agentProfiles = await this.agentProfileModel
        .find({ adminId: user._id })
        .select('userId')
        .exec();

      const agentUserIds = agentProfiles.map((profile) => profile.userId);
      // Include admin's own ID and all their agents' IDs
      query.createdBy = { $in: [user._id, ...agentUserIds] };
    }

    // Filter by customer if provided
    if (customer) {
      if (!Types.ObjectId.isValid(customer)) {
        throw new BadRequestException('Invalid customer ID format');
      }
      query.customer = new Types.ObjectId(customer);
    }

    // Search functionality
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { firstName: { $regex: escapedSearch, $options: 'i' } },
        { lastName: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute queries
    const [items, total] = await Promise.all([
      this.contactModel
        .find(query)
        .populate('customer', 'name email fingerprint')
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.contactModel.countDocuments(query).exec(),
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

    return {
      items,
      meta,
    };
  }

  async findOne(
    id: string,
    user: { _id: Types.ObjectId; role: UserRole },
  ): Promise<ContactDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    // Build query with role-based filtering
    const query: any = { _id: id };

    if (user.role === UserRole.AGENT) {
      // Agents can only see contacts they created
      query.createdBy = user._id;
    } else if (user.role === UserRole.ADMIN) {
      // Admins can see contacts created by themselves and their agents
      const agentProfiles = await this.agentProfileModel
        .find({ adminId: user._id })
        .select('userId')
        .exec();

      const agentUserIds = agentProfiles.map((profile) => profile.userId);
      query.createdBy = { $in: [user._id, ...agentUserIds] };
    }

    const contact = await this.contactModel
      .findOne(query)
      .populate('customer', 'name email fingerprint')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return contact;
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
    user: { _id: Types.ObjectId; role: UserRole },
  ): Promise<ContactDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    // Build query with role-based filtering
    const query: any = { _id: id };

    if (user.role === UserRole.AGENT) {
      // Agents can only update contacts they created
      query.createdBy = user._id;
    } else if (user.role === UserRole.ADMIN) {
      // Admins can update contacts created by themselves and their agents
      const agentProfiles = await this.agentProfileModel
        .find({ adminId: user._id })
        .select('userId')
        .exec();

      const agentUserIds = agentProfiles.map((profile) => profile.userId);
      query.createdBy = { $in: [user._id, ...agentUserIds] };
    }

    const contact = await this.contactModel.findOne(query);
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    // If email is being updated, check for duplicates
    if (updateContactDto.email && updateContactDto.email !== contact.email) {
      const existingContact = await this.contactModel.findOne({
        email: updateContactDto.email,
        customer: contact.customer,
        _id: { $ne: id },
      });

      if (existingContact) {
        throw new BadRequestException(
          `Contact with email ${updateContactDto.email} already exists for this customer`,
        );
      }
    }

    const updatedContact = await this.contactModel
      .findByIdAndUpdate(id, updateContactDto, { new: true })
      .populate('customer', 'name email fingerprint')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return updatedContact!;
  }

  async remove(
    id: string,
    user: { _id: Types.ObjectId; role: UserRole },
  ): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    // Build query with role-based filtering
    const query: any = { _id: id };

    if (user.role === UserRole.AGENT) {
      // Agents can only delete contacts they created
      query.createdBy = user._id;
    } else if (user.role === UserRole.ADMIN) {
      // Admins can delete contacts created by themselves and their agents
      const agentProfiles = await this.agentProfileModel
        .find({ adminId: user._id })
        .select('userId')
        .exec();

      const agentUserIds = agentProfiles.map((profile) => profile.userId);
      query.createdBy = { $in: [user._id, ...agentUserIds] };
    }

    const result = await this.contactModel.findOneAndDelete(query).exec();
    if (!result) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }

  async findByCustomer(
    customerId: string,
    user: { _id: Types.ObjectId; role: UserRole },
  ): Promise<ContactDocument[]> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID format');
    }

    // Build query with role-based filtering
    const query: any = { customer: new Types.ObjectId(customerId) };

    if (user.role === UserRole.AGENT) {
      // Agents can only see contacts they created
      query.createdBy = user._id;
    } else if (user.role === UserRole.ADMIN) {
      // Admins can see contacts created by themselves and their agents
      const agentProfiles = await this.agentProfileModel
        .find({ adminId: user._id })
        .select('userId')
        .exec();

      const agentUserIds = agentProfiles.map((profile) => profile.userId);
      query.createdBy = { $in: [user._id, ...agentUserIds] };
    }

    return this.contactModel
      .find(query)
      .populate('customer', 'name email fingerprint')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }
}
