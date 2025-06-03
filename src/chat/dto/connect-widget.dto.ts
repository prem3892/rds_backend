import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class ConnectWidgetDto {
  @IsMongoId()
  @IsNotEmpty()
  widgetId: string;

  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsString()
  fingerprint: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  currentPageUrl: string;

  @IsObject()
  @IsNotEmpty()
  browserInfo: object;
}
