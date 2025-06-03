import { Document, Types } from 'mongoose';
export type CustomerDocument = Customer & Document;
export declare class Customer {
    _id: Types.ObjectId;
    fingerprint: string;
    name?: string;
    email?: string;
    metadata?: Record<string, any>;
    widgetId: Types.ObjectId;
    createdAt: Date;
}
export declare const CustomerSchema: import("mongoose").Schema<Customer, import("mongoose").Model<Customer, any, any, any, Document<unknown, any, Customer, any> & Customer & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Customer, Document<unknown, {}, import("mongoose").FlatRecord<Customer>, {}> & import("mongoose").FlatRecord<Customer> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
