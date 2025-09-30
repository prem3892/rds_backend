import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { UserDocument } from 'src/schemas/user.schema';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { Types } from 'mongoose';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async create(
    @AuthenticatedUser() admin: JwtPayload,
    @Body() createUserDto: CreateUserDto,
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.usersService.create(
      createUserDto,
      new Types.ObjectId(admin.sub),
    );
    const { password, ...result } = user.toObject();
    return result;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async findAll(): Promise<Omit<UserDocument, 'password'>[]> {
    const users = await this.usersService.findAll();
    return users.map((user) => {
      const { password, ...result } = user.toObject();
      return result;
    });
  }

  @Get(':userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER) // Or allow user to get their own profile
  async findOne(
    @Param('userId') userId: string,
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.usersService.findByIdOrFail(userId);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Put(':userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER) // Or allow user to update their own profile
  async update(
    @AuthenticatedUser() admin: JwtPayload,
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Omit<UserDocument, 'password'>> {
    // Ensure ADMIN cannot accidentally demote the last ADMIN or change their own role if not allowed
    // Add more specific logic if needed for role changes.
    const user = await this.usersService.update(
      userId,
      updateUserDto,
      new Types.ObjectId(admin.sub),
    );
    const { password, ...result } = user.toObject();
    return result;
  }

  @Delete(':userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async remove(
    @Param('userId') userId: string,
  ): Promise<Omit<UserDocument, 'password'>> {
    // Add logic to prevent deleting the last admin
    const user = await this.usersService.remove(userId);
    const { password, ...result } = user.toObject();
    return result;
  }
}
