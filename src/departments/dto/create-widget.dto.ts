import {
  IsArray,
  IsBoolean,
  IsHexColor,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateWidgetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  domains?: string[];

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  departmentIds?: Types.ObjectId[];

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsString()
  headerText?: string;
}
