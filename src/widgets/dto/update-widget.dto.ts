import {
  IsArray,
  IsBoolean,
  IsHexColor,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

export class UpdateWidgetDto {
  @ApiProperty({
    description: 'Widget name for identification',
    example: 'Updated Website Chat Widget',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Array of domains where this widget can be embedded',
    type: [String],
    example: ['example.com', 'www.example.com', 'subdomain.example.com'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domains?: string[];

  @ApiProperty({
    description: 'Array of department IDs that this widget can route chats to',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  departmentIds?: Types.ObjectId[];

  @ApiProperty({
    description: 'Whether the widget is enabled and can be used',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Primary color for the widget theme (hex color)',
    example: '#3b82f6',
    required: false,
  })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

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
}
