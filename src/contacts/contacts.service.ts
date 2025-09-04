import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact, ContactDocument } from '../schemas/contact.schema';
import { Customer, CustomerDocument } from '../schemas/customer.schema';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { GetContactsDto } from './dto/get-contacts.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async create(createContactDto: CreateContactDto): Promise<ContactDocument> {
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

    const contact = new this.contactModel({
      ...createContactDto,
      customer: new Types.ObjectId(createContactDto.customer),
    });

    return contact.save();
  }

  async findAll(queryDto: GetContactsDto): Promise<{
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

  async findOne(id: string): Promise<ContactDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    const contact = await this.contactModel
      .findById(id)
      .populate('customer', 'name email fingerprint')
      .exec();

    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }

    return contact;
  }

  async update(
    id: string,
    updateContactDto: UpdateContactDto,
  ): Promise<ContactDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    const contact = await this.contactModel.findById(id);
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
      .exec();

    return updatedContact!;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid contact ID format');
    }

    const result = await this.contactModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }

  async findByCustomer(customerId: string): Promise<ContactDocument[]> {
    if (!Types.ObjectId.isValid(customerId)) {
      throw new BadRequestException('Invalid customer ID format');
    }

    return this.contactModel
      .find({ customer: new Types.ObjectId(customerId) })
      .populate('customer', 'name email fingerprint')
      .sort({ createdAt: -1 })
      .exec();
  }
}
