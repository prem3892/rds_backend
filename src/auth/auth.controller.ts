import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
  Query,
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
import {
  ResendAdminVerificationDto,
  AdminSignupResponseDto,
} from './dto/admin-verification.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/password-reset.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  LoginResponseDto,
  UserResponseDto,
  RefreshTokenResponseDto,
} from './dto/auth-responses.dto';
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
    description: 'Invalid credentials or email not verified',
    type: UnauthorizedResponseDto,
    examples: {
      invalidCredentials: {
        summary: 'Invalid credentials',
        value: {
          statusCode: 401,
          message: 'Invalid credentials',
          error: 'Unauthorized',
        },
      },
      emailNotVerified: {
        summary: 'Email not verified',
        value: {
          statusCode: 401,
          message:
            'Please verify your email address before logging in. Check your inbox for the verification email.',
          error: 'Unauthorized',
        },
      },
    },
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('register')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Register new user with email verification (Admin only)',
    description:
      'Admin can register new agents or other admins in the system. A verification email will be sent to the new user, and they must verify their email before login. For agents, working hours can be specified using the shifts field.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Verification email sent.',
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
    summary: 'Admin self-registration with email verification',
    description:
      'Initial admin registration endpoint for system setup. Creates admin account and sends verification email. Admin must verify email before login.',
  })
  @ApiBody({ type: AdminRegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Admin registered successfully. Verification email sent.',
    type: AdminSignupResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or email already exists',
    type: ErrorResponseDto,
  })
  async registerAdmin(
    @Body() adminRegisterDto: AdminRegisterDto,
  ): Promise<AdminSignupResponseDto> {
    const user = await this.authService.registerAdmin(adminRegisterDto);
    const { password, ...userResult } = user.toObject();

    return {
      message:
        'Admin account created successfully. Please check your email to verify your account.',
      user: userResult,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generate new access and refresh tokens using a valid refresh token',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid refresh token',
    type: ErrorResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: UnauthorizedResponseDto,
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Revoke all refresh tokens for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  async logout(@AuthenticatedUser() user: JwtPayload) {
    await this.authService.revokeRefreshToken(user.sub);
    return { message: 'Logout successful' };
  }

  @Post('revoke-all-tokens')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke all refresh tokens',
    description:
      'Revoke all refresh tokens for the authenticated user (useful for security purposes)',
  })
  @ApiResponse({
    status: 200,
    description: 'All tokens revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'All tokens revoked successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  async revokeAllTokens(@AuthenticatedUser() user: JwtPayload) {
    await this.authService.revokeRefreshToken(user.sub);
    return { message: 'All tokens revoked successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset email to user',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset email sent successfully',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email or user not found',
    type: ErrorResponseDto,
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.sendPasswordResetEmail(forgotPasswordDto.email);
    return { message: 'Password reset email sent successfully' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using token from email',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password reset successfully' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired token',
    type: ErrorResponseDto,
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    return { message: 'Password reset successfully' };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description:
      'Change user password by providing current password and new password. Requires authentication.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Current password is incorrect',
    type: ErrorResponseDto,
  })
  async changePassword(
    @AuthenticatedUser() user: JwtPayload,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.sub,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Post('send-verification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send email verification',
    description: 'Send email verification link to authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Verification email sent successfully',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
    type: UnauthorizedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Email already verified or user not found',
    type: ErrorResponseDto,
  })
  async sendEmailVerification(@AuthenticatedUser() user: JwtPayload) {
    await this.authService.sendEmailVerification(user.sub);
    return { message: 'Verification email sent successfully' };
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using token from email',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Email verified successfully' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification token',
    type: ErrorResponseDto,
  })
  async verifyEmail(@Query() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(verifyEmailDto.token);
    return { message: 'Email verified successfully. You can now login.' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description:
      'Resend verification email to any unverified user account. Can be used if the original verification email was not received or expired.',
  })
  @ApiBody({ type: ResendAdminVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Verification email sent successfully. Please check your inbox.',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid email, user not found, or email already verified',
    type: ErrorResponseDto,
  })
  async resendVerification(
    @Body() resendVerificationDto: ResendAdminVerificationDto,
  ) {
    await this.authService.resendVerificationEmail(resendVerificationDto.email);
    return {
      message: 'Verification email sent successfully. Please check your inbox.',
    };
  }

  @Post('admin/resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend admin verification email',
    description:
      'Resend verification email to unverified admin account. Can be used if the original verification email was not received or expired.',
  })
  @ApiBody({ type: ResendAdminVerificationDto })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Verification email sent successfully. Please check your inbox.',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid email, user not found, not an admin, or email already verified',
    type: ErrorResponseDto,
  })
  async resendAdminVerification(
    @Body() resendVerificationDto: ResendAdminVerificationDto,
  ) {
    await this.authService.resendAdminVerificationEmail(
      resendVerificationDto.email,
    );
    return {
      message: 'Verification email sent successfully. Please check your inbox.',
    };
  }
}
