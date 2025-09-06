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

  async login(
    loginDto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const validatedUser = await this.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!validatedUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified for all users
    if (!validatedUser.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address before logging in. Check your inbox for the verification email.',
      );
    }

    // Generate tokens
    const tokens = await this.generateTokens(validatedUser);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: validatedUser._id,
        email: validatedUser.email,
        firstName: validatedUser.firstName,
        lastName: validatedUser.lastName,
        role: validatedUser.role,
        phoneNo: validatedUser.phoneNo,
        website: validatedUser.website,
        isEmailVerified: validatedUser.isEmailVerified,
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

    const { shifts, timezone, profilePicture, ...userDto } = registerDto;

    const user = await this.usersService.create(
      {
        ...userDto,
        isEmailVerified: false, // Require email verification for all users
      },
      adminId,
    );

    // If the user is an agent, create agent profile with shifts
    if (user.role === UserRole.AGENT) {
      const agentProfileData: any = {};

      if (shifts) {
        agentProfileData.shifts = shifts;
      }

      if (timezone) {
        agentProfileData.timezone = timezone;
      }

      if (profilePicture) {
        agentProfileData.profilePicture = profilePicture;
      }

      await this.agentsService.createAgentProfile(
        user._id,
        adminId,
        agentProfileData,
      );
    }

    // Send verification email instead of welcome email
    await this.sendUserVerificationEmail(user);

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
      isEmailVerified: false, // Admin must verify email before login
    });

    // Create agent profile for admin since admin is also an agent with super abilities
    await this.agentsService.createAgentProfile(user._id);

    // Send admin verification email instead of welcome email
    await this.sendAdminVerificationEmail(user);

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

  async generateTokens(
    user: any,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = {
      email: user.email,
      sub: user._id.toString(),
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      email: user.email,
      sub: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    // Store refresh token in database
    const refreshTokenExpires = new Date();
    refreshTokenExpires.setDate(refreshTokenExpires.getDate() + 7); // 7 days

    await this.usersService.updateUser(user._id, {
      refreshToken,
      refreshTokenExpires,
    });

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Get user from database
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Verify token version and stored refresh token
      if (
        user.tokenVersion !== payload.tokenVersion ||
        user.refreshToken !== refreshToken ||
        !user.refreshTokenExpires ||
        user.refreshTokenExpires < new Date()
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeRefreshToken(userId: string): Promise<boolean> {
    try {
      await this.usersService.updateUser(userId, {
        refreshToken: undefined,
        refreshTokenExpires: undefined,
        tokenVersion: { $inc: 1 }, // Increment token version to invalidate all existing tokens
      });
      return true;
    } catch (error) {
      return false;
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

  async sendAdminVerificationEmail(user: UserDocument): Promise<boolean> {
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 86400000); // 24 hours from now

    // Save verification token to user
    await this.usersService.updateUser(user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Create verification link
    const baseUrl = this.configService.get<string>('appDomain');
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send admin verification email
    return this.mailerService.sendAdminVerificationEmail(user.email, {
      firstName: user.firstName,
      lastName: user.lastName,
      verificationLink,
      expirationTime: '24 hours',
    });
  }

  async resendVerificationEmail(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Send appropriate verification email based on user role
    if (user.role === UserRole.ADMIN) {
      return this.sendAdminVerificationEmail(user);
    } else {
      return this.sendUserVerificationEmail(user);
    }
  }

  async resendAdminVerificationEmail(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new BadRequestException('This endpoint is only for admin accounts');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Send verification email
    return this.sendAdminVerificationEmail(user);
  }

  async sendUserVerificationEmail(user: UserDocument): Promise<boolean> {
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 86400000); // 24 hours from now

    // Save verification token to user
    await this.usersService.updateUser(user._id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Create verification link
    const baseUrl = this.configService.get<string>('appDomain');
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Send user verification email
    return this.mailerService.sendAccountVerificationEmail(user.email, {
      firstName: user.firstName,
      lastName: user.lastName,
      verificationLink,
      expirationTime: '24 hours',
    });
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
