import { OmitType } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class AdminRegisterDto extends OmitType(RegisterDto, [
  'role',
] as const) {}
