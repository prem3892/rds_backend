import { Types } from 'mongoose';
export declare class CreateWidgetDto {
    name: string;
    domains?: string[];
    departmentIds?: Types.ObjectId[];
    isEnabled?: boolean;
    primaryColor?: string;
    welcomeMessage?: string;
    headerText?: string;
}
