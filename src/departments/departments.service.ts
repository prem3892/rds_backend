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

  async findAllByAdmin(adminId: Types.ObjectId): Promise<DepartmentDocument[]> {
    return this.departmentModel
      .find({ createdBy: adminId })
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

  async findByIdAndAdmin(
    id: string | Types.ObjectId,
    adminId: Types.ObjectId,
  ): Promise<DepartmentDocument> {
    const department = await this.departmentModel
      .findOne({ _id: id, createdBy: adminId })
      .populate('createdBy', 'firstName lastName email')
      .exec();
    if (!department) {
      throw new NotFoundException(
        `Department with ID ${id} not found or you don't have permission to access it`,
      );
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

  async updateByAdmin(
    id: string,
    updateDepartmentDto: UpdateDepartmentDto,
    adminId: Types.ObjectId,
  ): Promise<DepartmentDocument> {
    const department = await this.findByIdAndAdmin(id, adminId); // Ensures department exists and belongs to admin

    if (
      updateDepartmentDto.name &&
      updateDepartmentDto.name !== department.name
    ) {
      const existingDepartment = await this.departmentModel
        .findOne({
          name: updateDepartmentDto.name,
          _id: { $ne: id },
          createdBy: adminId,
        })
        .exec();
      if (existingDepartment) {
        throw new ConflictException(
          `Department with name "${updateDepartmentDto.name}" already exists.`,
        );
      }
    }

    const updatedDepartment = await this.departmentModel
      .findOneAndUpdate({ _id: id, createdBy: adminId }, updateDepartmentDto, {
        new: true,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();
    if (!updatedDepartment) {
      throw new NotFoundException(
        `Department with ID ${id} not found for update or you don't have permission to update it.`,
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

  async removeByAdmin(
    id: string,
    adminId: Types.ObjectId,
  ): Promise<DepartmentDocument> {
    // First check if the department exists and belongs to the admin
    await this.findByIdAndAdmin(id, adminId);

    // Add logic here to check if department is in use by any widgets or agents before deleting
    // For example, query Widgets and AgentProfiles
    const deletedDepartment = await this.departmentModel
      .findOneAndDelete({ _id: id, createdBy: adminId })
      .exec();
    if (!deletedDepartment) {
      throw new NotFoundException(
        `Department with ID ${id} not found or you don't have permission to delete it`,
      );
    }
    return deletedDepartment;
  }

  /**
   * Find or create a default department for an admin.
   * If admin has existing departments, returns the first (oldest) one.
   * If no departments exist, creates a "General Support" department.
   */
  async findOrCreateDefaultDepartment(
    adminId: Types.ObjectId,
  ): Promise<DepartmentDocument> {
    // First, try to find existing departments for this admin
    const existingDepartments = await this.departmentModel
      .find({ createdBy: adminId })
      .sort({ createdAt: 1 }) // Sort by creation date, oldest first
      .limit(1)
      .exec();

    if (existingDepartments.length > 0) {
      return existingDepartments[0];
    }

    // No departments exist, create a default one
    const defaultDepartmentData = {
      name: 'General Support',
      description: 'Default department for general support inquiries',
      createdBy: adminId,
    };

    const defaultDepartment = new this.departmentModel(defaultDepartmentData);
    return defaultDepartment.save();
  }
}
