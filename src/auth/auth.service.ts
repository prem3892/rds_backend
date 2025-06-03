import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UserRole } from '../shared/constants/enums';
import { UserDocument } from 'src/schemas/user.schema';
import { AgentsService } from 'src/agents/agents.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly agentsService: AgentsService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<UserDocument, 'password'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await user.validatePassword(pass))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string; user: any }> {
    const validatedUser = await this.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!validatedUser) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload: JwtPayload = {
      email: validatedUser.email,
      sub: validatedUser._id.toString(),
      role: validatedUser.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: validatedUser._id,
        email: validatedUser.email,
        firstName: validatedUser.firstName,
        lastName: validatedUser.lastName,
        role: validatedUser.role,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<UserDocument> {
    // This registration should ideally be restricted or done by a super-admin
    // For simplicity, allowing direct registration now.
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const user = await this.usersService.create({
      ...registerDto,
    });

    if (user.role === UserRole.AGENT) {
      await this.agentsService.createAgentProfile(user._id);
    }

    return user;
  }

  async registerAdmin(
    adminRegisterDto: AdminRegisterDto,
  ): Promise<UserDocument> {
    const existingUser = await this.usersService.findByEmail(
      adminRegisterDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const user = await this.usersService.create({
      ...adminRegisterDto,
      role: UserRole.ADMIN, // Explicitly set role to ADMIN
    });

    // Admin users might not need an "agent profile",
    // but if there's any generic profile setup, it could be done here.
    // For now, we assume admins don't have agent profiles.

    return user;
  }

  async validateSocketToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      // Optionally, re-verify user from DB
      const user = await this.usersService.findById(payload.sub);
      if (!user || user.role !== payload.role) {
        return null;
      }
      return payload;
    } catch (error) {
      return null;
    }
  }
}
