import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { RolesGuard } from '../shared/guards/roles.guard';
import { UserDocument } from 'src/schemas/user.schema';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { Types } from 'mongoose';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // This should be protected, e.g., only by a super-admin or initial setup script
  // For now, let's assume an ADMIN can register other ADMINS or AGENTS
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('register')
  async register(
    @AuthenticatedUser() admin: JwtPayload,
    @Body() registerDto: RegisterDto,
  ): Promise<Omit<UserDocument, 'password'>> {
    const user = await this.authService.register(
      registerDto,
      new Types.ObjectId(admin.sub),
    );
    const { password, ...result } = user.toObject();
    return result;
  }

  @Post('admin/signup')
  @HttpCode(HttpStatus.CREATED)
  async registerAdmin(
    @Body() adminRegisterDto: AdminRegisterDto,
  ): Promise<Omit<UserDocument, 'password'>> {
    // Assuming UserRole.ADMIN will be set in the service
    const user = await this.authService.registerAdmin(adminRegisterDto);
    const { password, ...result } = user.toObject();
    return result;
  }
}
