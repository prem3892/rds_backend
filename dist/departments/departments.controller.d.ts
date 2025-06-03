import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
export declare class DepartmentsController {
    private readonly departmentsService;
    constructor(departmentsService: DepartmentsService);
    create(createDepartmentDto: CreateDepartmentDto): Promise<import("../schemas/department.schema").DepartmentDocument>;
    findAll(): Promise<import("../schemas/department.schema").DepartmentDocument[]>;
    findOne(id: string): Promise<import("../schemas/department.schema").DepartmentDocument>;
    update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<import("../schemas/department.schema").DepartmentDocument>;
    remove(id: string): Promise<import("../schemas/department.schema").DepartmentDocument>;
}
