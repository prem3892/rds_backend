import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { AgentsService } from 'src/agents/agents.service';
import { UserRole } from 'src/shared/constants/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    // Inject AgentsService carefully to avoid circular deps if it also injects UsersService
    // Using string token or forwardRef in module can help. For now, direct inject for simplicity in one direction.
    private readonly agentsService: AgentsService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    adminId?: Types.ObjectId,
  ): Promise<UserDocument> {
    const existingUser = await this.userModel
      .findOne({ email: createUserDto.email.toLowerCase() })
      .exec();
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const createdUser = new this.userModel(createUserDto);
    const savedUser = await createdUser.save();

    // Create agent profile for both AGENT and ADMIN roles since admin is also an agent with super abilities
    if (
      savedUser.role === UserRole.AGENT ||
      savedUser.role === UserRole.ADMIN
    ) {
      await this.agentsService.createAgentProfile(savedUser._id, adminId);
    }
    return savedUser;
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      // Do not throw NotFoundException here if used for auth validation
      // Throw it in controllers where a user must exist
      return null;
    }
    return user;
  }

  async findByIdOrFail(id: string | Types.ObjectId): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findOne(filter: any): Promise<UserDocument | null> {
    return this.userModel.findOne(filter).exec();
  }

  async updateUser(
    id: string | Types.ObjectId,
    updateData: any,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findManyByIds(
    ids: (string | Types.ObjectId)[],
  ): Promise<UserDocument[]> {
    return this.userModel
      .find({ _id: { $in: ids } })
      .select('-password')
      .lean() // Use lean for performance if you only need plain JS objects
      .exec();
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    adminId?: Types.ObjectId,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (
      updateUserDto.email &&
      updateUserDto.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser && existingUser._id.toString() !== id) {
        throw new ConflictException('Email already in use by another user.');
      }
      user.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      user.password = updateUserDto.password; // Hashing is done by pre-save hook
    }
    if (updateUserDto.firstName) user.firstName = updateUserDto.firstName;
    if (updateUserDto.lastName) user.lastName = updateUserDto.lastName;

    const oldRole = user.role;
    if (updateUserDto.role) user.role = updateUserDto.role;

    const updatedUser = await user.save();

    // Handle AgentProfile creation/deletion if role changes
    const needsAgentProfile = (role: UserRole) =>
      role === UserRole.AGENT || role === UserRole.ADMIN;

    if (!needsAgentProfile(oldRole) && needsAgentProfile(updatedUser.role)) {
      // User changed from a non-agent role to agent/admin role
      await this.agentsService.createAgentProfile(updatedUser._id, adminId);
    } else if (
      needsAgentProfile(oldRole) &&
      !needsAgentProfile(updatedUser.role)
    ) {
      // User changed from agent/admin role to a non-agent role
      await this.agentsService.deleteAgentProfile(updatedUser._id);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = updatedUser.toObject();
    return result as unknown as UserDocument;
  }

  async remove(id: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    // Delete agent profile for both AGENT and ADMIN roles
    if (user.role === UserRole.AGENT || user.role === UserRole.ADMIN) {
      await this.agentsService.deleteAgentProfile(user._id);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user.toObject();
    return result as unknown as UserDocument;
  }
}
