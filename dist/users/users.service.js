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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../schemas/user.schema");
const agents_service_1 = require("../agents/agents.service");
const enums_1 = require("../shared/constants/enums");
let UsersService = class UsersService {
    userModel;
    agentsService;
    constructor(userModel, agentsService) {
        this.userModel = userModel;
        this.agentsService = agentsService;
    }
    async create(createUserDto) {
        const existingUser = await this.userModel
            .findOne({ email: createUserDto.email.toLowerCase() })
            .exec();
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists.');
        }
        const createdUser = new this.userModel(createUserDto);
        const savedUser = await createdUser.save();
        if (savedUser.role === enums_1.UserRole.AGENT) {
            await this.agentsService.createAgentProfile(savedUser._id);
        }
        return savedUser;
    }
    async findAll() {
        return this.userModel.find().select('-password').exec();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid user ID format');
        }
        const user = await this.userModel.findById(id).select('-password').exec();
        if (!user) {
            return null;
        }
        return user;
    }
    async findByIdOrFail(id) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }
    async findManyByIds(ids) {
        return this.userModel
            .find({ _id: { $in: ids } })
            .select('-password')
            .lean()
            .exec();
    }
    async update(id, updateUserDto) {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        if (updateUserDto.email &&
            updateUserDto.email.toLowerCase() !== user.email.toLowerCase()) {
            const existingUser = await this.findByEmail(updateUserDto.email);
            if (existingUser && existingUser._id.toString() !== id) {
                throw new common_1.ConflictException('Email already in use by another user.');
            }
            user.email = updateUserDto.email;
        }
        if (updateUserDto.password) {
            user.password = updateUserDto.password;
        }
        if (updateUserDto.firstName)
            user.firstName = updateUserDto.firstName;
        if (updateUserDto.lastName)
            user.lastName = updateUserDto.lastName;
        const oldRole = user.role;
        if (updateUserDto.role)
            user.role = updateUserDto.role;
        const updatedUser = await user.save();
        if (oldRole !== enums_1.UserRole.AGENT && updatedUser.role === enums_1.UserRole.AGENT) {
            await this.agentsService.createAgentProfile(updatedUser._id);
        }
        else if (oldRole === enums_1.UserRole.AGENT &&
            updatedUser.role !== enums_1.UserRole.AGENT) {
            await this.agentsService.deleteAgentProfile(updatedUser._id);
        }
        const { password, ...result } = updatedUser.toObject();
        return result;
    }
    async remove(id) {
        const user = await this.userModel.findByIdAndDelete(id).exec();
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${id} not found`);
        }
        if (user.role === enums_1.UserRole.AGENT) {
            await this.agentsService.deleteAgentProfile(user._id);
        }
        const { password, ...result } = user.toObject();
        return result;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        agents_service_1.AgentsService])
], UsersService);
//# sourceMappingURL=users.service.js.map