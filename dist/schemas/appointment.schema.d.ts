import { Document, Types } from 'mongoose';
import { AppointmentStatus } from 'src/shared/constants/enums';
export type AppointmentDocument = Appointment & Document;
export declare class Appointment {
    _id: Types.ObjectId;
    chatSessionId: Types.ObjectId;
    agentId: Types.ObjectId;
    customerId: Types.ObjectId;
    appointmentTime: Date;
    notes?: string;
    status: AppointmentStatus;
    createdAt: Date;
    updatedAt: Date;
}
export declare const AppointmentSchema: import("mongoose").Schema<Appointment, import("mongoose").Model<Appointment, any, any, any, Document<unknown, any, Appointment, any> & Appointment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Appointment, Document<unknown, {}, import("mongoose").FlatRecord<Appointment>, {}> & import("mongoose").FlatRecord<Appointment> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
