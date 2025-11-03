import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VisitorSyncDto {
  @ApiProperty({
    description: 'Last sync timestamp in ISO format',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastSync?: string;

  @ApiProperty({
    description: 'Client version number for compatibility',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  version?: number;

  @ApiProperty({
    description: 'Force a full sync instead of delta update',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  forceFullSync?: boolean;
}
