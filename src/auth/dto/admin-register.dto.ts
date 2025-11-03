import { OmitType, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { RegisterDto } from './register.dto';

export class AdminRegisterDto extends OmitType(RegisterDto, ['role'] as const) {
  @ApiProperty({
    description:
      'Whether the registration is from mobile app. If true, OTP verification will be used instead of email link.',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_mobile?: boolean;
}
