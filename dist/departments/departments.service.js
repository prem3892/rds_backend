"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const department_schema_1 = require("../schemas/department.schema");
let DepartmentsService = class DepartmentsService {
    departmentModel;
    constructor(departmentModel) {
        this.departmentModel = departmentModel;
    }
    async create(createDepartmentDto) {
        const existingDepartment = await this.departmentModel
            .findOne({ name: createDepartmentDto.name })
            .exec();
        if (existingDepartment) {
            throw new common_1.ConflictException(`Department with name "${createDepartmentDto.name}" already exists.`);
        }
        const createdDepartment = new this.departmentModel(createDepartmentDto);
        return createdDepartment.save();
    }
    async findAll() {
        return this.departmentModel.find().exec();
    }
    async findById(id) {
        const department = await this.departmentModel.findById(id).exec();
        if (!department) {
            throw new common_1.NotFoundException(`Department with ID ${id} not found`);
        }
        return department;
    }
    async findByIds(ids) {
        return this.departmentModel.find({ _id: { $in: ids } }).exec();
    }
    async update(id, updateDepartmentDto) {
        const department = await this.findById(id);
        if (updateDepartmentDto.name &&
            updateDepartmentDto.name !== department.name) {
            const existingDepartment = await this.departmentModel
                .findOne({ name: updateDepartmentDto.name, _id: { $ne: id } })
                .exec();
            if (existingDepartment) {
                throw new common_1.ConflictException(`Department with name "${updateDepartmentDto.name}" already exists.`);
            }
        }
        const updatedDepartment = await this.departmentModel
            .findByIdAndUpdate(id, updateDepartmentDto, { new: true })
            .exec();
        if (!updatedDepartment) {
            throw new common_1.NotFoundException(`Department with ID ${id} not found for update.`);
        }
        return updatedDepartment;
    }
    async remove(id) {
        const deletedDepartment = await this.departmentModel
            .findByIdAndDelete(id)
            .exec();
        if (!deletedDepartment) {
            throw new common_1.NotFoundException(`Department with ID ${id} not found`);
        }
        return deletedDepartment;
    }
};
exports.DepartmentsService = DepartmentsService;
exports.DepartmentsService = DepartmentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(department_schema_1.Department.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], DepartmentsService);
//# sourceMappingURL=departments.service.js.map