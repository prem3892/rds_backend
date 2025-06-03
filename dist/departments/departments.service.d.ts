import { Model, Types } from 'mongoose';
import { DepartmentDocument } from 'src/schemas/department.schema';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
export declare class DepartmentsService {
    private departmentModel;
    constructor(departmentModel: Model<DepartmentDocument>);
    create(createDepartmentDto: CreateDepartmentDto): Promise<DepartmentDocument>;
    findAll(): Promise<DepartmentDocument[]>;
    findById(id: string | Types.ObjectId): Promise<DepartmentDocument>;
    findByIds(ids: Types.ObjectId[]): Promise<DepartmentDocument[]>;
    update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<DepartmentDocument>;
    remove(id: string): Promise<DepartmentDocument>;
}
