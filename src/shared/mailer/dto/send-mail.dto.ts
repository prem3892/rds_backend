import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
} from 'class-validator';

export class SendMailDto {
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  to: string | string[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsEmail()
  @IsOptional()
  from?: string;

  @IsEmail({}, { each: true })
  @IsOptional()
  cc?: string | string[];

  @IsEmail({}, { each: true })
  @IsOptional()
  bcc?: string | string[];
}

export class SendTemplateMailDto {
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  to: string | string[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  template: string;

  @IsNotEmpty()
  context: Record<string, any>;

  @IsEmail()
  @IsOptional()
  from?: string;

  @IsEmail({}, { each: true })
  @IsOptional()
  cc?: string | string[];

  @IsEmail({}, { each: true })
  @IsOptional()
  bcc?: string | string[];
}
