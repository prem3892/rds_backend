import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsMongoId,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetAutoMessagesDto {
  @ApiProperty({
    description: 'Filter by widget ID',
    required: false,
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  widgetId?: string;

  @ApiProperty({
    description: 'Filter by domain',
    required: false,
    example: 'example.com',
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({
    description: 'Filter by enabled status',
    required: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Filter by sitewide status',
    required: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  sitewide?: boolean;

  @ApiProperty({
    description: 'Search in title and message',
    required: false,
    example: 'welcome',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Page number (1-based)',
    required: false,
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
