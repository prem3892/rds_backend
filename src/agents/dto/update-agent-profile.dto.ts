import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Types } from 'mongoose';

export class UpdateAgentProfileDto {
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  departmentIds?: Types.ObjectId[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  domainAccess?: string[];

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConcurrentChats?: number;

  // password can be updated via UserModule PUT /users/:id or a dedicated /agents/me/profile route
}
