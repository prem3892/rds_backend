import { Document, Types } from 'mongoose';
export type DepartmentDocument = Department & Document;
export declare class Department {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const DepartmentSchema: import("mongoose").Schema<Department, import("mongoose").Model<Department, any, any, any, Document<unknown, any, Department, any> & Department & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Department, Document<unknown, {}, import("mongoose").FlatRecord<Department>, {}> & import("mongoose").FlatRecord<Department> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
