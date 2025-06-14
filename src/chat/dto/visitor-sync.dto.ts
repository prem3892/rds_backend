import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class VisitorSyncDto {
  @IsOptional()
  @IsString()
  lastSync?: string;

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsBoolean()
  forceFullSync?: boolean;
}
