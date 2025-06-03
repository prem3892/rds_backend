import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from 'src/schemas/customer.schema';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
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
}
