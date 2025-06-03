import { Model, Types } from 'mongoose';
import { CustomerDocument } from 'src/schemas/customer.schema';
export declare class CustomersService {
    private customerModel;
    constructor(customerModel: Model<CustomerDocument>);
    findById(id: string | Types.ObjectId): Promise<CustomerDocument | null>;
    findByIdOrFail(id: string | Types.ObjectId): Promise<CustomerDocument>;
    findByFingerprintAndWidget(fingerprint: string, widgetId: Types.ObjectId): Promise<CustomerDocument | null>;
    createOrUpdateCustomer(data: {
        widgetId: Types.ObjectId;
        fingerprint: string;
        customerId?: string;
        name?: string;
        email?: string;
        metadata?: Record<string, any>;
    }): Promise<CustomerDocument>;
    updateCustomerDetails(customerId: string, details: {
        name?: string;
        email?: string;
    }): Promise<CustomerDocument>;
    findCustomersByNameOrEmail(name?: string, email?: string): Promise<Types.ObjectId[]>;
}
