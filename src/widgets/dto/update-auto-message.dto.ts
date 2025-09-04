import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateAutoMessageDto } from './create-auto-message.dto';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  Min,
  IsMongoId,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateAutoMessageDto extends PartialType(CreateAutoMessageDto) {
  @ApiProperty({
    description: 'Title of the auto message',
    example: 'Updated Welcome Message',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description: 'Content of the auto message',
    example:
      'Hello! We have updated our support system. How can we help you today?',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: 'Widget ID this auto message belongs to',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  widgetId?: string;

  @ApiProperty({
    description: 'Domain where this auto message will be displayed',
    example: 'updated-example.com',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  domain?: string;

  @ApiProperty({
    description:
      'Whether this auto message should be shown on every page (sitewide)',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  sitewide?: boolean;

  @ApiProperty({
    description:
      'Array of page paths where this auto message will be displayed (relative paths)',
    example: ['updated-path/page1', 'updated-path/page2'],
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
  pagePaths?: string[];

  @ApiProperty({
    description: 'Number of seconds to wait before showing the auto message',
    example: 10,
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  showAfterSeconds?: number;

  @ApiProperty({
    description: 'Whether the auto message is enabled',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
