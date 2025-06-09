import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from 'src/schemas/department.schema';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
  ) {}

  async create(
    createDepartmentDto: CreateDepartmentDto,
    userId: Types.ObjectId,
  ): Promise<DepartmentDocument> {
    const existingDepartment = await this.departmentModel
      .findOne({ name: createDepartmentDto.name })
      .exec();
    if (existingDepartment) {
      throw new ConflictException(
        `Department with name "${createDepartmentDto.name}" already exists.`,
      );
    }

    // Create department with user ID from the custom decorator
    const departmentData = {
      ...createDepartmentDto,
      createdBy: userId,
    };

    const createdDepartment = new this.departmentModel(departmentData);
    return createdDepartment.save();
  }

  async findAll(): Promise<DepartmentDocument[]> {
    return this.departmentModel
      .find()
      .populate('createdBy', 'firstName lastName email')
      .exec();
  }

  async findById(id: string | Types.ObjectId): Promise<DepartmentDocument> {
    const department = await this.departmentModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .exec();
    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return department;
  }

  async findByIds(ids: Types.ObjectId[]): Promise<DepartmentDocument[]> {
    return this.departmentModel
      .find({ _id: { $in: ids } })
      .populate('createdBy', 'firstName lastName email')
      .exec();
  }

  async update(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentDocument> {
    const department = await this.findById(id); // Ensures department exists

    if (
      updateDepartmentDto.name &&
      updateDepartmentDto.name !== department.name
    ) {
      const existingDepartment = await this.departmentModel
        .findOne({ name: updateDepartmentDto.name, _id: { $ne: id } })
        .exec();
      if (existingDepartment) {
        throw new ConflictException(
          `Department with name "${updateDepartmentDto.name}" already exists.`,
        );
      }
    }

    const updatedDepartment = await this.departmentModel
      .findByIdAndUpdate(id, updateDepartmentDto, { new: true })
      .exec();
    if (!updatedDepartment) {
      // Should not happen due to findById check, but good practice
      throw new NotFoundException(
        `Department with ID ${id} not found for update.`,
      );
    }
    return updatedDepartment;
  }

  async remove(id: string): Promise<DepartmentDocument> {
    // Add logic here to check if department is in use by any widgets or agents before deleting
    // For example, query Widgets and AgentProfiles
    const deletedDepartment = await this.departmentModel
      .findByIdAndDelete(id)
      .exec();
    if (!deletedDepartment) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }
    return deletedDepartment;
  }
}
