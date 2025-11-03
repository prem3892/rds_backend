import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsHexColor,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';
import { ButtonLocation, WidgetTheme } from '../../schemas/widget.schema';

export class CreateWidgetThemeDto {
  @ApiProperty({
    description: 'Theme name',
    example: 'Blue Slate Theme',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Primary color (hex color)',
    example: '#3b82f6',
  })
  @IsHexColor()
  primaryColor: string;

  @ApiProperty({
    description: 'Secondary color (hex color)',
    example: '#64748b',
  })
  @IsHexColor()
  secondaryColor: string;

  @ApiProperty({
    description: 'Accent color (hex color)',
    example: '#f59e0b',
    required: false,
  })
  @IsOptional()
  @IsHexColor()
  accentColor?: string;

  @ApiProperty({
    description: 'Text color (hex color)',
    example: '#1f2937',
    required: false,
  })
  @IsOptional()
  @IsHexColor()
  textColor?: string;

  @ApiProperty({
    description: 'Background color (hex color)',
    example: '#ffffff',
    required: false,
  })
  @IsOptional()
  @IsHexColor()
  backgroundColor?: string;
}

export class CreateWidgetDto {
  @ApiProperty({
    description: 'Widget name for identification',
    example: 'Main Website Chat Widget',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Array of domains where this widget can be embedded',
    type: [String],
    example: ['example.com', 'www.example.com', 'subdomain.example.com'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  domains?: string[];

  @ApiProperty({
    description: 'Array of department IDs that this widget can route chats to',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    required: false,
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  departmentIds?: Types.ObjectId[];

  @ApiProperty({
    description: 'Whether the widget is enabled and can be used',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Primary color for the widget theme (hex color)',
    example: '#3b82f6',
    required: false,
    default: '#3b82f6',
  })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiProperty({
    description: 'Secondary color for the widget theme (hex color)',
    example: '#64748b',
    required: false,
  })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string;

  @ApiProperty({
    description: 'Theme object that defines the complete color scheme',
    type: CreateWidgetThemeDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateWidgetThemeDto)
  theme?: CreateWidgetThemeDto;

  @ApiProperty({
    description: 'Welcome message displayed when chat widget opens',
    example: 'Hello! How can we help you today?',
    required: false,
  })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @ApiProperty({
    description: 'Header text displayed in the chat widget',
    example: 'Customer Support',
    required: false,
  })
  @IsOptional()
  @IsString()
  headerText?: string;

  @ApiProperty({
    description: 'Text displayed when all agents are offline',
    example:
      'We are currently offline. Please leave a message and we will get back to you.',
    required: false,
  })
  @IsOptional()
  @IsString()
  offline_text?: string;

  @ApiProperty({
    description: 'Array of email addresses to receive notifications',
    type: [String],
    example: ['admin@example.com', 'support@example.com'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  notification_emails?: string[];

  @ApiProperty({
    description: 'Position of the chat button on the webpage',
    enum: ButtonLocation,
    example: ButtonLocation.BOTTOM_RIGHT,
    required: false,
    default: ButtonLocation.BOTTOM_RIGHT,
  })
  @IsOptional()
  @IsEnum(ButtonLocation)
  button_location?: ButtonLocation;

  @ApiProperty({
    description: 'Text displayed on the chat button',
    example: 'Chat with us',
    required: false,
    default: 'Chat with us',
  })
  @IsOptional()
  @IsString()
  button_label?: string;

  @ApiProperty({
    description: 'Text color for the widget (hex color)',
    example: '#ffffff',
    required: false,
  })
  @IsOptional()
  @IsHexColor()
  widget_text_color?: string;
}
