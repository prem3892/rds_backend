import {
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class InitiateChatDto {
  @IsMongoId()
  @IsNotEmpty()
  customerId: string; // Provided by server:widget_initialized

  @IsMongoId()
  @IsNotEmpty()
  widgetId: string;

  @IsMongoId()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  initialMessage: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isAutoMessage?: boolean;
}
