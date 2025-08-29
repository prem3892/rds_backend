import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { LoginResponseDto, UserResponseDto } from './dto/auth-responses.dto';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { UserRole } from '../shared/constants/enums';
import { RolesGuard } from '../shared/guards/roles.guard';
import { UserDocument } from 'src/schemas/user.schema';
import { AuthenticatedUser } from '../shared/decorators/user.decorator';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { Types } from 'mongoose';
import {
  ErrorResponseDto,
  UnauthorizedResponseDto,
  ForbiddenResponseDto,
} from '../shared/dto/common-responses.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticate user with email and password to receive JWT token',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: UnauthorizedResponseDto,
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('register')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Register new user (Admin only)',
    description: 'Admin can register new agents or other admins in the system',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or email already exists',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
    type: ForbiddenResponseDto,
  })
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
  @ApiOperation({
    summary: 'Admin self-registration',
    description:
      'Initial admin registration endpoint for system setup. This endpoint allows the first admin to be created.',
  })
  @ApiBody({ type: AdminRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Admin registered successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or email already exists',
    type: ErrorResponseDto,
  })
  async registerAdmin(
    @Body() adminRegisterDto: AdminRegisterDto,
  ): Promise<Omit<UserDocument, 'password'>> {
    // Assuming UserRole.ADMIN will be set in the service
    const user = await this.authService.registerAdmin(adminRegisterDto);
    const { password, ...result } = user.toObject();
    return result;
  }
}
