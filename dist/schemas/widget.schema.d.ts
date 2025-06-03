import { Document, Types } from 'mongoose';
export type WidgetDocument = Widget & Document;
export declare class Widget {
    _id: Types.ObjectId;
    name: string;
    domains: string[];
    departmentIds: Types.ObjectId[];
    injectableScriptUrl: string;
    isEnabled: boolean;
    primaryColor?: string;
    welcomeMessage?: string;
    headerText?: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const WidgetSchema: import("mongoose").Schema<Widget, import("mongoose").Model<Widget, any, any, any, Document<unknown, any, Widget, any> & Widget & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Widget, Document<unknown, {}, import("mongoose").FlatRecord<Widget>, {}> & import("mongoose").FlatRecord<Widget> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
