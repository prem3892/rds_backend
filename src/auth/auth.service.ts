import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailerService } from '../shared/mailer/mailer.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { JwtPayload } from '../shared/interfaces/jwt-payload.interface';
import { UserRole } from '../shared/constants/enums';
import { UserDocument } from 'src/schemas/user.schema';
import { AgentsService } from 'src/agents/agents.service';
import { Types } from 'mongoose';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly agentsService: AgentsService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
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
        phoneNo: validatedUser.phoneNo,
        website: validatedUser.website,
      },
    };
  }

  async register(
    registerDto: RegisterDto,
    adminId?: Types.ObjectId,
  ): Promise<UserDocument> {
    // This registration should ideally be restricted or done by a super-admin
    // For simplicity, allowing direct registration now.
    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    const user = await this.usersService.create(
      {
        ...registerDto,
      },
      adminId,
    );

    // Send welcome email
    await this.sendWelcomeEmail(user);

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

    // Create agent profile for admin since admin is also an agent with super abilities
    await this.agentsService.createAgentProfile(user._id);

    // Send welcome email
    await this.sendWelcomeEmail(user);

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

  async sendPasswordResetEmail(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    await this.usersService.updateUser(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    // Create reset link
    const appDomain = this.configService.get<string>('appDomain');
    const resetLink = `http://${appDomain}/reset-password?token=${resetToken}`;

    // Send email
    return this.mailerService.sendResetPasswordEmail(user.email, {
      firstName: user.firstName,
      lastName: user.lastName,
      resetLink,
      expirationTime: '1 hour',
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.usersService.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password and clear reset token
    await this.usersService.updateUser(user._id, {
      password: newPassword,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
    });

    return true;
  }

  async sendEmailVerification(userId: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 86400000); // 24 hours from now

    // Save verification token to user
    await this.usersService.updateUser(user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Create verification link
    const appDomain = this.configService.get<string>('appDomain');
    const verificationLink = `http://${appDomain}/verify-email?token=${verificationToken}`;

    // Send email
    return this.mailerService.sendAccountVerificationEmail(user.email, {
      firstName: user.firstName,
      lastName: user.lastName,
      verificationLink,
      expirationTime: '24 hours',
    });
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.usersService.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark email as verified and clear verification token
    await this.usersService.updateUser(user._id, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });

    return true;
  }

  private async sendWelcomeEmail(user: UserDocument): Promise<void> {
    try {
      const appDomain = this.configService.get<string>('appDomain');
      const loginUrl = `http://${appDomain}/login`;
      const supportEmail =
        this.configService.get<string>('mail.from') || 'support@yourapp.com';

      await this.mailerService.sendWelcomeEmail(user.email, {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        loginUrl,
        supportEmail,
      });
    } catch (error) {
      // Log error but don't throw - welcome email failure shouldn't break registration
      console.error('Failed to send welcome email:', error);
    }
  }
}
