import {
  IsOptional,
  IsString,
  IsNumberString,
  IsBoolean,
  IsEnum,
  IsMongoId,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum WidgetSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetWidgetsQueryDto {
  @ApiProperty({
    description: 'Text search in widget name and domains',
    example: 'support',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter by enabled/disabled status',
    example: true,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({
    description: 'Comma-separated list of department IDs to filter by',
    example: '507f1f77bcf86cd799439011,507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  @IsString()
  departmentIds?: string;

  @ApiProperty({
    description: 'Filter by domain (partial match)',
    example: 'example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Field to sort by',
    enum: WidgetSortBy,
    example: WidgetSortBy.CREATED_AT,
    required: false,
    default: WidgetSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(WidgetSortBy)
  sortBy?: WidgetSortBy = WidgetSortBy.CREATED_AT;

  @ApiProperty({
    description: 'Sort order',
    enum: SortOrder,
    example: SortOrder.DESC,
    required: false,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
