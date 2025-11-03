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

  @IsOptional()
  @IsString()
  fingerprint?: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  currentPageUrl: string;

  @IsObject()
  @IsNotEmpty()
  browserInfo: {
    userAgent?: string;
    language?: string;
    platform?: string;
    screenResolution?: string;
    timezone?: string;
    cookieEnabled?: boolean;
    doNotTrack?: string;
    plugins?: string[];
    canvas?: string;
    webgl?: string;
    [key: string]: any;
  };
}
