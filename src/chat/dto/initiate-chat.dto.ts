import {
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class InitiateChatDto {
  @IsMongoId()
  @IsNotEmpty()
  customerId: string; // Provided by server:widget_initialized

  @IsMongoId()
  @IsNotEmpty()
  widgetId: string;

  @IsMongoId()
  @IsNotEmpty()
  departmentId: string;

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
}
