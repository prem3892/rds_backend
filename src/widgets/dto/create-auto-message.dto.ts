import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsArray,
  IsOptional,
  IsNumber,
  Min,
  IsMongoId,
  ArrayMinSize,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAutoMessageDto {
  @ApiProperty({
    description: 'Title of the auto message',
    example: 'Welcome to our support',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Content of the auto message',
    example: 'Hello! How can we help you today?',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Widget ID this auto message belongs to',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId()
  widgetId: string;

  @ApiProperty({
    description: 'Domain where this auto message will be displayed',
    example: 'example.com',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({
    description:
      'Whether this auto message should be shown on every page (sitewide)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  sitewide?: boolean = false;

  @ApiProperty({
    description:
      'Array of page paths where this auto message will be displayed (relative paths)',
    example: ['path/to/post1', 'path/to/post2', 'about-us'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((path) => path.trim())
        .filter((path) => path.length > 0);
    }
    return value;
  })
  pagePaths?: string[] = [];

  @ApiProperty({
    description: 'Number of seconds to wait before showing the auto message',
    example: 5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  showAfterSeconds: number;
}
